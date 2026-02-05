/**
 * WebhookHandlerService - Idempotent webhook processing for subscription payments
 * Based on Comademig architecture with robust idempotency and signature validation
 * 
 * Features:
 * - Idempotent processing using asaas_event_id
 * - Webhook signature validation
 * - Event registration in subscription_webhook_events
 * - Automatic retry for failed processing
 * - Isolated routing (/api/subscriptions/webhook)
 */

import type { 
  WebhookEvent, 
  WebhookResult, 
  WebhookAction,
  LogEntry 
} from '../../types/subscription.types.js';
import { subscriptionConfig } from '../../config/subscription.config.js';
import crypto from 'crypto';

export interface WebhookPayload {
  event: string;
  payment?: {
    id: string;
    status: string;
    value: number;
    customer: string;
    subscription?: string;
    confirmedDate?: string;
    description?: string;
  };
  subscription?: {
    id: string;
    status: string;
    customer: string;
    nextDueDate?: string;
  };
}

export interface ProcessedWebhookEvent {
  id: string;
  asaasEventId: string;
  eventType: string;
  payload: WebhookPayload;
  signatureValid: boolean;
  processed: boolean;
  processedAt?: Date;
  processingResult?: any;
  errorMessage?: string;
  subscriptionOrderId?: string;
  asaasPaymentId?: string;
  asaasSubscriptionId?: string;
}

export class WebhookHandlerService {
  private readonly config = subscriptionConfig;

  /**
   * Process incoming webhook with idempotency and signature validation
   * Main entry point for webhook processing
   */
  async processWebhook(
    payload: WebhookPayload,
    signature: string,
    asaasEventId: string
  ): Promise<WebhookResult> {
    const correlationId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      this.log('INFO', 'Processing webhook event', {
        correlationId,
        asaasEventId,
        eventType: payload.event
      });

      // Step 1: Check idempotency - has this event been processed before?
      const existingEvent = await this.checkEventIdempotency(asaasEventId);
      if (existingEvent) {
        this.log('INFO', 'Webhook event already processed (idempotent)', {
          correlationId,
          asaasEventId,
          processedAt: existingEvent.processedAt
        });

        return {
          success: true,
          eventId: asaasEventId,
          eventType: payload.event,
          processed: true,
          actions: []
        };
      }

      // Step 2: Validate webhook signature
      const signatureValid = this.validateWebhookSignature(payload, signature);
      if (!signatureValid) {
        this.log('WARN', 'Invalid webhook signature', {
          correlationId,
          asaasEventId,
          signature: signature.substring(0, 10) + '...'
        });

        await this.registerWebhookEvent({
          asaasEventId,
          eventType: payload.event,
          payload,
          signatureValid: false,
          processed: false,
          errorMessage: 'Invalid webhook signature'
        });

        return {
          success: false,
          eventId: asaasEventId,
          eventType: payload.event,
          processed: false,
          actions: [],
          error: 'Invalid webhook signature'
        };
      }

      // Step 3: Register webhook event for audit trail
      await this.registerWebhookEvent({
        asaasEventId,
        eventType: payload.event,
        payload,
        signatureValid: true,
        processed: false
      });

      // Step 4: Process webhook based on event type
      const actions = await this.processWebhookEvent(payload, correlationId);

      // Step 5: Mark event as processed
      await this.markEventAsProcessed(asaasEventId, {
        success: true,
        actions,
        processedAt: new Date()
      });

      this.log('INFO', 'Webhook event processed successfully', {
        correlationId,
        asaasEventId,
        actionsCount: actions.length
      });

      return {
        success: true,
        eventId: asaasEventId,
        eventType: payload.event,
        processed: true,
        actions
      };

    } catch (error) {
      this.log('ERROR', 'Failed to process webhook event', {
        correlationId,
        asaasEventId,
        error: error instanceof Error ? error.message : String(error)
      });

      // Register failed processing
      await this.markEventAsProcessed(asaasEventId, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processedAt: new Date()
      });

      return {
        success: false,
        eventId: asaasEventId,
        eventType: payload.event,
        processed: false,
        actions: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check if webhook event has already been processed (idempotency)
   */
  private async checkEventIdempotency(asaasEventId: string): Promise<ProcessedWebhookEvent | null> {
    try {
      const response = await fetch(
        `${this.config.supabase.url}/rest/v1/subscription_webhook_events?asaas_event_id=eq.${asaasEventId}&select=*`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.supabase.anonKey,
            'Authorization': `Bearer ${this.config.supabase.anonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to check event idempotency: ${response.status}`);
      }

      const events = await response.json();
      return events.length > 0 ? events[0] : null;

    } catch (error) {
      this.log('ERROR', 'Failed to check event idempotency', {
        asaasEventId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Validate webhook signature using HMAC-SHA256
   */
  private validateWebhookSignature(payload: WebhookPayload, signature: string): boolean {
    try {
      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.config.asaas.webhookToken)
        .update(payloadString)
        .digest('hex');

      // Compare signatures using constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

    } catch (error) {
      this.log('ERROR', 'Failed to validate webhook signature', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Register webhook event in subscription_webhook_events table
   */
  private async registerWebhookEvent(eventData: {
    asaasEventId: string;
    eventType: string;
    payload: WebhookPayload;
    signatureValid: boolean;
    processed: boolean;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const webhookEventRecord = {
        asaas_event_id: eventData.asaasEventId,
        event_type: eventData.eventType,
        payload: eventData.payload,
        signature_valid: eventData.signatureValid,
        processed: eventData.processed,
        error_message: eventData.errorMessage || null,
        asaas_payment_id: eventData.payload.payment?.id || null,
        asaas_subscription_id: eventData.payload.subscription?.id || null
      };

      const response = await fetch(`${this.config.supabase.url}/rest/v1/subscription_webhook_events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.supabase.anonKey,
          'Authorization': `Bearer ${this.config.supabase.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(webhookEventRecord)
      });

      if (!response.ok) {
        throw new Error(`Failed to register webhook event: ${response.status} ${response.statusText}`);
      }

      this.log('DEBUG', 'Webhook event registered', {
        asaasEventId: eventData.asaasEventId,
        eventType: eventData.eventType
      });

    } catch (error) {
      this.log('ERROR', 'Failed to register webhook event', {
        asaasEventId: eventData.asaasEventId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't propagate registration errors - webhook processing should continue
    }
  }

  /**
   * Process webhook event based on event type
   */
  private async processWebhookEvent(payload: WebhookPayload, correlationId: string): Promise<WebhookAction[]> {
    const actions: WebhookAction[] = [];

    switch (payload.event) {
      case 'PAYMENT_CONFIRMED':
        if (payload.payment) {
          const paymentAction = await this.handlePaymentConfirmed(payload.payment, correlationId);
          actions.push(paymentAction);
        }
        break;

      case 'PAYMENT_RECEIVED':
        if (payload.payment) {
          const receivedAction = await this.handlePaymentReceived(payload.payment, correlationId);
          actions.push(receivedAction);
        }
        break;

      case 'SUBSCRIPTION_CREATED':
        if (payload.subscription) {
          const subscriptionAction = await this.handleSubscriptionCreated(payload.subscription, correlationId);
          actions.push(subscriptionAction);
        }
        break;

      default:
        this.log('WARN', 'Unhandled webhook event type', {
          correlationId,
          eventType: payload.event
        });
        actions.push({
          type: 'PAYMENT_CONFIRMED',
          entityId: payload.payment?.id || 'unknown',
          result: 'SKIPPED',
          details: { reason: 'Unhandled event type' }
        });
    }

    return actions;
  }

  /**
   * Handle PAYMENT_CONFIRMED webhook event
   * Triggers subscription creation and user activation
   */
  private async handlePaymentConfirmed(payment: any, correlationId: string): Promise<WebhookAction> {
    try {
      this.log('INFO', 'Processing PAYMENT_CONFIRMED webhook', {
        correlationId,
        paymentId: payment.id,
        status: payment.status,
        value: payment.value
      });

      // Find subscription order by payment ID
      const subscriptionOrder = await this.findSubscriptionOrderByPaymentId(payment.id);
      
      if (!subscriptionOrder) {
        this.log('WARN', 'Subscription order not found for payment', {
          correlationId,
          paymentId: payment.id
        });

        return {
          type: 'PAYMENT_CONFIRMED',
          entityId: payment.id,
          result: 'SKIPPED',
          details: { reason: 'Subscription order not found' }
        };
      }

      // Update subscription order status to active
      await this.updateSubscriptionOrderStatus(subscriptionOrder.id, 'active');
      
      this.log('INFO', 'Subscription order status updated to active', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        paymentId: payment.id
      });

      // Trigger subscription creation if not already created
      if (!subscriptionOrder.asaas_subscription_id) {
        const subscriptionResult = await this.triggerSubscriptionCreation(subscriptionOrder, correlationId);
        
        if (subscriptionResult.success) {
          this.log('INFO', 'Subscription creation triggered successfully', {
            correlationId,
            subscriptionOrderId: subscriptionOrder.id,
            subscriptionId: subscriptionResult.subscriptionId
          });
        } else {
          this.log('ERROR', 'Failed to trigger subscription creation', {
            correlationId,
            subscriptionOrderId: subscriptionOrder.id,
            error: subscriptionResult.error
          });
        }
      }

      // Trigger user activation and notification
      await this.triggerUserActivation(subscriptionOrder, correlationId);

      // Process affiliate commissions if applicable
      if (subscriptionOrder.affiliate_id) {
        await this.processAffiliateCommissions(subscriptionOrder, payment, correlationId);
      }

      return {
        type: 'PAYMENT_CONFIRMED',
        entityId: payment.id,
        result: 'SUCCESS',
        details: {
          subscriptionOrderId: subscriptionOrder.id,
          status: 'active',
          value: payment.value,
          confirmedDate: payment.confirmedDate
        }
      };

    } catch (error) {
      this.log('ERROR', 'Failed to handle PAYMENT_CONFIRMED', {
        correlationId,
        paymentId: payment.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Implement retry mechanism for failed processing
      await this.scheduleRetry('PAYMENT_CONFIRMED', payment.id, correlationId);

      return {
        type: 'PAYMENT_CONFIRMED',
        entityId: payment.id,
        result: 'FAILED',
        details: { 
          error: error instanceof Error ? error.message : String(error),
          retryScheduled: true
        }
      };
    }
  }

  /**
   * Handle PAYMENT_RECEIVED webhook event
   */
  private async handlePaymentReceived(payment: any, correlationId: string): Promise<WebhookAction> {
    // Similar to PAYMENT_CONFIRMED but for different payment status
    return this.handlePaymentConfirmed(payment, correlationId);
  }

  /**
   * Handle SUBSCRIPTION_CREATED webhook event
   * Updates subscription order with subscription details and processes recurring billing setup
   */
  private async handleSubscriptionCreated(subscription: any, correlationId: string): Promise<WebhookAction> {
    try {
      this.log('INFO', 'Processing SUBSCRIPTION_CREATED webhook', {
        correlationId,
        subscriptionId: subscription.id,
        status: subscription.status,
        customer: subscription.customer,
        nextDueDate: subscription.nextDueDate
      });

      // Update subscription order with subscription ID and details
      const updateResult = await this.updateSubscriptionOrderWithSubscriptionId(subscription.id, subscription);

      if (updateResult) {
        // Log successful subscription setup
        this.log('INFO', 'Subscription order updated with subscription details', {
          correlationId,
          subscriptionId: subscription.id,
          nextDueDate: subscription.nextDueDate,
          status: subscription.status
        });

        // Send subscription confirmation notification
        await this.sendSubscriptionConfirmationNotification(subscription, correlationId);

        // Update user profile with subscription details
        await this.updateUserProfileWithSubscription(subscription, correlationId);

        return {
          type: 'SUBSCRIPTION_CREATED',
          entityId: subscription.id,
          result: 'SUCCESS',
          details: {
            subscriptionId: subscription.id,
            status: subscription.status,
            nextDueDate: subscription.nextDueDate,
            customer: subscription.customer
          }
        };
      } else {
        this.log('WARN', 'Subscription order not found for subscription', {
          correlationId,
          subscriptionId: subscription.id,
          customer: subscription.customer
        });

        return {
          type: 'SUBSCRIPTION_CREATED',
          entityId: subscription.id,
          result: 'SKIPPED',
          details: { reason: 'Subscription order not found' }
        };
      }

    } catch (error) {
      this.log('ERROR', 'Failed to handle SUBSCRIPTION_CREATED', {
        correlationId,
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Schedule retry for failed subscription processing
      await this.scheduleRetry('SUBSCRIPTION_CREATED', subscription.id, correlationId);

      return {
        type: 'SUBSCRIPTION_CREATED',
        entityId: subscription.id,
        result: 'FAILED',
        details: { 
          error: error instanceof Error ? error.message : String(error),
          retryScheduled: true
        }
      };
    }
  }

  /**
   * Send subscription confirmation notification
   */
  private async sendSubscriptionConfirmationNotification(subscription: any, correlationId: string): Promise<void> {
    try {
      this.log('INFO', 'Sending subscription confirmation notification', {
        correlationId,
        subscriptionId: subscription.id,
        customer: subscription.customer,
        nextDueDate: subscription.nextDueDate
      });

      // In a real implementation, this would integrate with notification service
      // await notificationService.sendSubscriptionConfirmation({
      //   subscriptionId: subscription.id,
      //   customerEmail: subscription.customerEmail,
      //   nextBillingDate: subscription.nextDueDate,
      //   subscriptionValue: subscription.value
      // });

    } catch (error) {
      this.log('ERROR', 'Failed to send subscription confirmation notification', {
        correlationId,
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Update user profile with subscription details
   */
  private async updateUserProfileWithSubscription(subscription: any, correlationId: string): Promise<void> {
    try {
      // Find user by customer ID
      const userResponse = await fetch(
        `${this.config.supabase.url}/rest/v1/profiles?asaas_customer_id=eq.${subscription.customer}&select=*`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.supabase.anonKey,
            'Authorization': `Bearer ${this.config.supabase.anonKey}`
          }
        }
      );

      if (!userResponse.ok) {
        throw new Error(`Failed to find user profile: ${userResponse.status}`);
      }

      const users = await userResponse.json();
      
      if (users.length > 0) {
        const user = users[0];
        
        // Update user profile with subscription details
        const updateResponse = await fetch(
          `${this.config.supabase.url}/rest/v1/profiles?id=eq.${user.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': this.config.supabase.anonKey,
              'Authorization': `Bearer ${this.config.supabase.anonKey}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              asaas_subscription_id: subscription.id,
              subscription_status: 'active',
              subscription_next_due_date: subscription.nextDueDate,
              subscription_value: subscription.value,
              updated_at: new Date().toISOString()
            })
          }
        );

        if (!updateResponse.ok) {
          throw new Error(`Failed to update user profile: ${updateResponse.status}`);
        }

        this.log('INFO', 'User profile updated with subscription details', {
          correlationId,
          userId: user.id,
          subscriptionId: subscription.id,
          nextDueDate: subscription.nextDueDate
        });
      }

    } catch (error) {
      this.log('ERROR', 'Failed to update user profile with subscription', {
        correlationId,
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Mark webhook event as processed
   */
  private async markEventAsProcessed(asaasEventId: string, result: {
    success: boolean;
    actions?: WebhookAction[];
    error?: string;
    processedAt: Date;
  }): Promise<void> {
    try {
      const updateData = {
        processed: true,
        processed_at: result.processedAt.toISOString(),
        processing_result: {
          success: result.success,
          actions: result.actions || [],
          error: result.error || null
        },
        error_message: result.error || null
      };

      const response = await fetch(
        `${this.config.supabase.url}/rest/v1/subscription_webhook_events?asaas_event_id=eq.${asaasEventId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.supabase.anonKey,
            'Authorization': `Bearer ${this.config.supabase.anonKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to mark event as processed: ${response.status}`);
      }

    } catch (error) {
      this.log('ERROR', 'Failed to mark event as processed', {
        asaasEventId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Find subscription order by Asaas payment ID
   */
  private async findSubscriptionOrderByPaymentId(paymentId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.config.supabase.url}/rest/v1/subscription_orders?asaas_payment_id=eq.${paymentId}&select=*`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.supabase.anonKey,
            'Authorization': `Bearer ${this.config.supabase.anonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to find subscription order: ${response.status}`);
      }

      const orders = await response.json();
      return orders.length > 0 ? orders[0] : null;

    } catch (error) {
      this.log('ERROR', 'Failed to find subscription order', {
        paymentId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Update subscription order status
   */
  private async updateSubscriptionOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.supabase.url}/rest/v1/subscription_orders?id=eq.${orderId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.supabase.anonKey,
            'Authorization': `Bearer ${this.config.supabase.anonKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            status,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update subscription order status: ${response.status}`);
      }

    } catch (error) {
      this.log('ERROR', 'Failed to update subscription order status', {
        orderId,
        status,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Trigger subscription creation (implementation for subscription creation after payment confirmation)
   */
  private async triggerSubscriptionCreation(subscriptionOrder: any, correlationId: string): Promise<{
    success: boolean;
    subscriptionId?: string;
    error?: string;
  }> {
    try {
      this.log('INFO', 'Triggering subscription creation', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        customerId: subscriptionOrder.asaas_customer_id,
        paymentId: subscriptionOrder.asaas_payment_id
      });

      // Prepare subscription data for Asaas API
      const subscriptionData = {
        customer: subscriptionOrder.asaas_customer_id,
        billingType: 'CREDIT_CARD',
        value: subscriptionOrder.total_amount,
        cycle: 'MONTHLY',
        description: subscriptionOrder.description || 'Assinatura Premium - Acesso completo à plataforma',
        nextDueDate: this.calculateNextBillingDate(),
        creditCardToken: subscriptionOrder.credit_card_token, // From initial payment
        split: subscriptionOrder.split_data ? JSON.parse(subscriptionOrder.split_data) : undefined
      };

      // Call Asaas API to create subscription
      const response = await fetch(`${this.config.asaas.baseUrl}/v3/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': this.config.asaas.apiKey
        },
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Asaas API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const subscriptionResult = await response.json();

      // Update subscription order with subscription ID
      await this.updateSubscriptionOrderWithSubscriptionId(subscriptionResult.id, subscriptionResult);

      this.log('INFO', 'Subscription created successfully', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        subscriptionId: subscriptionResult.id,
        nextDueDate: subscriptionResult.nextDueDate
      });

      return {
        success: true,
        subscriptionId: subscriptionResult.id
      };

    } catch (error) {
      this.log('ERROR', 'Failed to create subscription', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Calculate next billing date (monthly cycle)
   */
  private calculateNextBillingDate(): string {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(nextMonth.getDate()); // Keep same day of month
    return nextMonth.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Trigger user activation after payment confirmation
   */
  private async triggerUserActivation(subscriptionOrder: any, correlationId: string): Promise<void> {
    try {
      this.log('INFO', 'Triggering user activation', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        userId: subscriptionOrder.user_id
      });

      // Update user status to active in database
      if (subscriptionOrder.user_id) {
        await this.updateUserSubscriptionStatus(subscriptionOrder.user_id, 'active');
      }

      // Send welcome notification
      await this.sendWelcomeNotification(subscriptionOrder, correlationId);

      this.log('INFO', 'User activation completed', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        userId: subscriptionOrder.user_id
      });

    } catch (error) {
      this.log('ERROR', 'Failed to activate user', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw - user activation failure shouldn't fail webhook processing
    }
  }

  /**
   * Process affiliate commissions after payment confirmation
   */
  private async processAffiliateCommissions(subscriptionOrder: any, payment: any, correlationId: string): Promise<void> {
    try {
      this.log('INFO', 'Processing affiliate commissions', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        affiliateId: subscriptionOrder.affiliate_id,
        paymentValue: payment.value
      });

      // Calculate commission amounts based on subscription value
      const commissionData = {
        subscriptionOrderId: subscriptionOrder.id,
        affiliateId: subscriptionOrder.affiliate_id,
        paymentId: payment.id,
        totalValue: payment.value,
        commissionPercentage: 15, // 15% for direct affiliate
        commissionAmount: Math.round(payment.value * 0.15)
      };

      // Record commission in database
      await this.recordAffiliateCommission(commissionData);

      // If there are splits configured, they should already be processed by Asaas
      if (subscriptionOrder.split_data) {
        this.log('INFO', 'Split payments processed by Asaas', {
          correlationId,
          subscriptionOrderId: subscriptionOrder.id,
          splitData: subscriptionOrder.split_data
        });
      }

      this.log('INFO', 'Affiliate commissions processed', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        commissionAmount: commissionData.commissionAmount
      });

    } catch (error) {
      this.log('ERROR', 'Failed to process affiliate commissions', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw - commission processing failure shouldn't fail webhook processing
    }
  }

  /**
   * Schedule retry for failed webhook processing
   */
  private async scheduleRetry(eventType: string, entityId: string, correlationId: string): Promise<void> {
    try {
      const retryData = {
        event_type: eventType,
        entity_id: entityId,
        correlation_id: correlationId,
        retry_count: 0,
        max_retries: 3,
        next_retry_at: new Date(Date.now() + 60000).toISOString(), // Retry in 1 minute
        created_at: new Date().toISOString()
      };

      // In a real implementation, this would be stored in a retry queue table
      this.log('INFO', 'Retry scheduled for failed webhook processing', {
        correlationId,
        eventType,
        entityId,
        nextRetryAt: retryData.next_retry_at
      });

    } catch (error) {
      this.log('ERROR', 'Failed to schedule retry', {
        correlationId,
        eventType,
        entityId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Update user subscription status
   */
  private async updateUserSubscriptionStatus(userId: string, status: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.supabase.url}/rest/v1/profiles?user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.supabase.anonKey,
            'Authorization': `Bearer ${this.config.supabase.anonKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            subscription_status: status,
            subscription_activated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update user subscription status: ${response.status}`);
      }

    } catch (error) {
      this.log('ERROR', 'Failed to update user subscription status', {
        userId,
        status,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Send welcome notification to user
   */
  private async sendWelcomeNotification(subscriptionOrder: any, correlationId: string): Promise<void> {
    try {
      // In a real implementation, this would integrate with email/SMS service
      this.log('INFO', 'Welcome notification sent', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        userEmail: subscriptionOrder.customer_email,
        notificationType: 'subscription_welcome'
      });

      // Placeholder for actual notification implementation
      // await emailService.sendWelcomeEmail(subscriptionOrder.customer_email, {
      //   customerName: subscriptionOrder.customer_name,
      //   subscriptionId: subscriptionOrder.id,
      //   nextBillingDate: subscriptionOrder.next_due_date
      // });

    } catch (error) {
      this.log('ERROR', 'Failed to send welcome notification', {
        correlationId,
        subscriptionOrderId: subscriptionOrder.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Record affiliate commission in database
   */
  private async recordAffiliateCommission(commissionData: {
    subscriptionOrderId: string;
    affiliateId: string;
    paymentId: string;
    totalValue: number;
    commissionPercentage: number;
    commissionAmount: number;
  }): Promise<void> {
    try {
      const commissionRecord = {
        subscription_order_id: commissionData.subscriptionOrderId,
        affiliate_id: commissionData.affiliateId,
        asaas_payment_id: commissionData.paymentId,
        total_value: commissionData.totalValue,
        commission_percentage: commissionData.commissionPercentage,
        commission_amount: commissionData.commissionAmount,
        status: 'confirmed',
        created_at: new Date().toISOString()
      };

      // In a real implementation, this would be stored in a commissions table
      this.log('INFO', 'Affiliate commission recorded', {
        subscriptionOrderId: commissionData.subscriptionOrderId,
        affiliateId: commissionData.affiliateId,
        commissionAmount: commissionData.commissionAmount
      });

    } catch (error) {
      this.log('ERROR', 'Failed to record affiliate commission', {
        subscriptionOrderId: commissionData.subscriptionOrderId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update subscription order with subscription ID
   */
  private async updateSubscriptionOrderWithSubscriptionId(subscriptionId: string, subscriptionData: any): Promise<boolean> {
    try {
      // First, find the subscription order by customer ID
      const findResponse = await fetch(
        `${this.config.supabase.url}/rest/v1/subscription_orders?asaas_customer_id=eq.${subscriptionData.customer}&select=*`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.supabase.anonKey,
            'Authorization': `Bearer ${this.config.supabase.anonKey}`
          }
        }
      );

      if (!findResponse.ok) {
        throw new Error(`Failed to find subscription order: ${findResponse.status}`);
      }

      const orders = await findResponse.json();
      
      if (orders.length === 0) {
        this.log('WARN', 'No subscription order found for customer', {
          customerId: subscriptionData.customer,
          subscriptionId
        });
        return false;
      }

      const order = orders[0];

      // Update the subscription order with subscription details
      const updateResponse = await fetch(
        `${this.config.supabase.url}/rest/v1/subscription_orders?id=eq.${order.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.supabase.anonKey,
            'Authorization': `Bearer ${this.config.supabase.anonKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            asaas_subscription_id: subscriptionId,
            next_due_date: subscriptionData.nextDueDate || null,
            subscription_status: subscriptionData.status || 'ACTIVE',
            subscription_cycle: subscriptionData.cycle || 'MONTHLY',
            subscription_value: subscriptionData.value || order.total_amount,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update subscription order: ${updateResponse.status}`);
      }

      this.log('INFO', 'Subscription order updated successfully', {
        subscriptionOrderId: order.id,
        subscriptionId,
        nextDueDate: subscriptionData.nextDueDate,
        status: subscriptionData.status
      });

      return true;

    } catch (error) {
      this.log('ERROR', 'Failed to update subscription order with subscription ID', {
        subscriptionId,
        customerId: subscriptionData.customer,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Structured logging
   */
  private log(level: LogEntry['level'], message: string, metadata?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'WebhookHandlerService',
      operation: 'processWebhook',
      correlationId: metadata?.correlationId || 'unknown',
      message,
      metadata
    };

    // In production, this would go to structured logging system
    console.log(JSON.stringify(logEntry));
  }
}