/**
 * PollingService - Robust payment status polling with configurable timeout
 * Based on Comademig architecture with 15-second timeout and 1-second interval
 * 
 * Features:
 * - Configurable timeout (default 15 seconds)
 * - Fixed 1-second polling interval
 * - Comprehensive audit logging
 * - Automatic resource cleanup
 * - Structured error handling
 */

import type { 
  PaymentStatus, 
  PollingResult, 
  LogEntry 
} from '../../types/subscription.types.js';
import { subscriptionConfig } from '../../config/subscription.config.js';

export interface PollingParams {
  paymentId: string;
  correlationId: string;
  timeoutMs?: number; // milliseconds (default 15000)
  intervalMs?: number; // milliseconds (default 1000)
}

export class PollingService {
  private readonly config = subscriptionConfig;
  private activePolls = new Map<string, AbortController>();

  /**
   * Poll payment status with configurable timeout and automatic cleanup
   * Implements Comademig pattern: 15s timeout, 1s interval, comprehensive logging
   */
  async pollPaymentStatus(params: PollingParams): Promise<PollingResult> {
    const {
      paymentId,
      correlationId,
      timeoutMs = this.config.polling.timeoutMs, // 15000ms
      intervalMs = this.config.polling.intervalMs // 1000ms
    } = params;

    const maxAttempts = Math.floor(timeoutMs / intervalMs);
    const startTime = Date.now();
    
    // Create abort controller for cleanup
    const abortController = new AbortController();
    this.activePolls.set(correlationId, abortController);

    try {
      this.log('INFO', 'Starting payment status polling', {
        correlationId,
        paymentId,
        timeoutMs,
        intervalMs,
        maxAttempts
      });

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Check if polling was aborted
        if (abortController.signal.aborted) {
          throw new Error('Polling aborted');
        }

        const attemptStartTime = Date.now();
        
        try {
          // Check payment status
          const paymentStatus = await this.checkPaymentStatusInternal(paymentId);
          const attemptDuration = Date.now() - attemptStartTime;
          const totalElapsed = Date.now() - startTime;

          // Log polling attempt for audit trail
          await this.logPollingAttempt({
            correlationId,
            paymentId,
            attempt,
            maxAttempts,
            status: paymentStatus.status,
            attemptDuration,
            totalElapsed,
            responseData: paymentStatus
          });

          // Check if payment is confirmed
          if (paymentStatus.status === 'CONFIRMED') {
            this.log('INFO', 'Payment confirmed via polling', {
              correlationId,
              paymentId,
              attempts: attempt,
              duration: totalElapsed
            });

            return {
              success: true,
              status: 'CONFIRMED',
              attempts: attempt,
              duration: totalElapsed,
              paymentData: paymentStatus
            };
          }

          // Check if payment failed
          if (['FAILED', 'REFUSED', 'CANCELLED'].includes(paymentStatus.status)) {
            this.log('WARN', 'Payment failed during polling', {
              correlationId,
              paymentId,
              status: paymentStatus.status,
              attempts: attempt,
              duration: totalElapsed
            });

            return {
              success: false,
              status: 'FAILED',
              attempts: attempt,
              duration: totalElapsed,
              error: `Payment ${paymentStatus.status.toLowerCase()}`,
              paymentData: paymentStatus
            };
          }

          // Wait for next attempt (if not the last one)
          if (attempt < maxAttempts) {
            await this.sleep(intervalMs, abortController.signal);
          }

        } catch (error) {
          const attemptDuration = Date.now() - attemptStartTime;
          const totalElapsed = Date.now() - startTime;

          this.log('WARN', `Polling attempt ${attempt} failed`, {
            correlationId,
            paymentId,
            error: error instanceof Error ? error.message : String(error),
            attemptDuration,
            totalElapsed
          });

          // Log failed attempt
          await this.logPollingAttempt({
            correlationId,
            paymentId,
            attempt,
            maxAttempts,
            status: 'ERROR',
            attemptDuration,
            totalElapsed,
            error: error instanceof Error ? error.message : String(error)
          });

          // If it's the last attempt, return error
          if (attempt === maxAttempts) {
            return {
              success: false,
              status: 'FAILED',
              attempts: attempt,
              duration: Date.now() - startTime,
              error: `Polling failed: ${error instanceof Error ? error.message : String(error)}`
            };
          }

          // Wait before next attempt
          await this.sleep(intervalMs, abortController.signal);
        }
      }

      // Timeout reached
      const totalElapsed = Date.now() - startTime;
      
      this.log('WARN', 'Polling timeout reached', {
        correlationId,
        paymentId,
        maxAttempts,
        duration: totalElapsed
      });

      // Log timeout
      await this.logPollingAttempt({
        correlationId,
        paymentId,
        attempt: maxAttempts,
        maxAttempts,
        status: 'TIMEOUT',
        attemptDuration: 0,
        totalElapsed,
        timeoutReached: true
      });

      return {
        success: false,
        status: 'TIMEOUT',
        attempts: maxAttempts,
        duration: totalElapsed,
        error: `Polling timeout after ${timeoutMs}ms`
      };

    } finally {
      // Cleanup: remove from active polls
      this.activePolls.delete(correlationId);
    }
  }

  /**
   * Check payment status via Asaas API (internal method)
   */
  private async checkPaymentStatusInternal(paymentId: string): Promise<PaymentStatus> {
    const response = await fetch(`${this.config.asaas.baseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.config.asaas.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to check payment status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      status: data.status,
      confirmedAt: data.confirmedDate ? new Date(data.confirmedDate) : undefined,
      failureReason: data.description
    };
  }

  /**
   * Log polling attempt for audit trail
   * Saves to subscription_polling_logs table
   */
  private async logPollingAttempt(params: {
    correlationId: string;
    paymentId: string;
    attempt: number;
    maxAttempts: number;
    status: string;
    attemptDuration: number;
    totalElapsed: number;
    responseData?: any;
    error?: string;
    timeoutReached?: boolean;
  }): Promise<void> {
    try {
      // Insert into subscription_polling_logs table for audit trail
      const logData = {
        correlation_id: params.correlationId,
        asaas_payment_id: params.paymentId,
        attempt_number: params.attempt,
        max_attempts: params.maxAttempts,
        status_checked: params.status,
        response_data: params.responseData || null,
        success: params.status === 'CONFIRMED',
        attempt_duration_ms: params.attemptDuration,
        total_elapsed_ms: params.totalElapsed,
        timeout_reached: params.timeoutReached || false,
        should_continue: params.attempt < params.maxAttempts && !['CONFIRMED', 'FAILED', 'REFUSED', 'CANCELLED'].includes(params.status),
        error_message: params.error || null,
        error_code: params.error ? 'POLLING_ERROR' : null
      };

      // Use Supabase client to insert log
      const response = await fetch(`${this.config.supabase.url}/rest/v1/subscription_polling_logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.supabase.anonKey,
          'Authorization': `Bearer ${this.config.supabase.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(logData)
      });

      if (!response.ok) {
        throw new Error(`Failed to insert polling log: ${response.status} ${response.statusText}`);
      }

      // Also log to console for immediate debugging
      this.log('DEBUG', 'Polling attempt logged to database', {
        correlationId: params.correlationId,
        paymentId: params.paymentId,
        attempt: params.attempt,
        status: params.status,
        success: logData.success
      });

    } catch (logError) {
      this.log('ERROR', 'Failed to log polling attempt to database', {
        error: logError instanceof Error ? logError.message : String(logError),
        correlationId: params.correlationId,
        paymentId: params.paymentId
      });
      // Don't propagate logging errors - polling should continue even if logging fails
    }
  }

  /**
   * Sleep with abort signal support for cleanup
   */
  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Sleep aborted'));
        });
      }
    });
  }

  /**
   * Abort active polling for a specific correlation ID
   */
  public abortPolling(correlationId: string): void {
    const controller = this.activePolls.get(correlationId);
    if (controller) {
      controller.abort();
      this.activePolls.delete(correlationId);
      this.log('INFO', 'Polling aborted', { correlationId });
    }
  }

  /**
   * Cleanup all active polling operations
   */
  public cleanup(): void {
    this.activePolls.forEach((controller, correlationId) => {
      controller.abort();
      this.log('INFO', 'Polling cleaned up', { correlationId });
    });
    this.activePolls.clear();
  }

  /**
   * Check payment status once (public method for API routes)
   */
  public async checkPaymentStatus(paymentId: string): Promise<{ success: boolean; status?: string; confirmedAt?: Date; subscriptionId?: string; error?: string }> {
    try {
      const paymentStatus = await this.checkPaymentStatusInternal(paymentId);
      
      return {
        success: true,
        status: paymentStatus.status,
        confirmedAt: paymentStatus.confirmedAt,
        subscriptionId: undefined // Would be populated if subscription was created
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check payment status'
      };
    }
  }

  /**
   * Structured logging
   */
  private log(level: LogEntry['level'], message: string, metadata?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'PollingService',
      operation: 'pollPaymentStatus',
      correlationId: metadata?.correlationId || 'unknown',
      message,
      metadata
    };

    // In production, this would go to structured logging system
    console.log(JSON.stringify(logEntry));
  }
}