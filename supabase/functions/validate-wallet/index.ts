/**
 * Validate Wallet Edge Function
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Edge Function para validação de Wallet IDs do Asaas
 * - Validação via API Asaas
 * - Cache de resultados
 * - Rate limiting
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipos
interface ValidateWalletRequest {
  walletId: string;
}

interface WalletValidationResponse {
  isValid: boolean;
  isActive: boolean;
  name?: string;
  email?: string;
  error?: string;
  cached: boolean;
}

// Configuração
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!;
const asaasEnvironment = Deno.env.get('ASAAS_ENVIRONMENT') || 'sandbox';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const asaasBaseUrl = asaasEnvironment === 'sandbox'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3';

serve(async (req) => {
  try {
    // Validar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse do body
    const { walletId }: ValidateWalletRequest = await req.json();

    console.log('Validating wallet', { walletId });

    // 1. Validar entrada
    if (!walletId || typeof walletId !== 'string') {
      return new Response(JSON.stringify({
        error: 'Wallet ID is required',
        code: 'MISSING_WALLET_ID',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validar formato
    if (!/^wal_[a-zA-Z0-9]{20}$/.test(walletId)) {
      return new Response(JSON.stringify({
        isValid: false,
        isActive: false,
        error: 'Invalid wallet ID format',
        cached: false,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Verificar cache primeiro
    const { data: cachedValidation } = await supabase
      .rpc('validate_asaas_wallet', { p_wallet_id: walletId })
      .single();

    if (cachedValidation && cachedValidation.cached) {
      console.log('Using cached validation', { 
        walletId, 
        isValid: cachedValidation.is_valid 
      });
      
      return new Response(JSON.stringify({
        isValid: cachedValidation.is_valid,
        isActive: cachedValidation.is_active,
        name: cachedValidation.name,
        email: cachedValidation.email,
        error: cachedValidation.error_message,
        cached: true,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Validar via API Asaas
    const validationResult = await validateWalletWithAsaas(walletId);

    // 4. Armazenar no cache
    await supabase.rpc('cache_wallet_validation', {
      p_wallet_id: walletId,
      p_validation_response: validationResult.response,
      p_is_valid: validationResult.isValid,
      p_error_message: validationResult.error,
    });

    console.log('Wallet validation completed', {
      walletId,
      isValid: validationResult.isValid,
      isActive: validationResult.isActive,
    });

    return new Response(JSON.stringify({
      isValid: validationResult.isValid,
      isActive: validationResult.isActive,
      name: validationResult.name,
      email: validationResult.email,
      error: validationResult.error,
      cached: false,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in validate-wallet function:', error);
    
    return new Response(JSON.stringify({
      isValid: false,
      isActive: false,
      error: 'Internal server error',
      cached: false,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Valida Wallet ID via API Asaas
 */
async function validateWalletWithAsaas(walletId: string): Promise<{
  isValid: boolean;
  isActive: boolean;
  name?: string;
  email?: string;
  error?: string;
  response?: any;
}> {
  try {
    console.log('Validating wallet with Asaas API', { walletId });

    const response = await fetch(`${asaasBaseUrl}/wallets/${walletId}`, {
      method: 'GET',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      console.log('Wallet not found', { walletId });
      return {
        isValid: false,
        isActive: false,
        error: 'Wallet ID não encontrada',
      };
    }

    if (!response.ok) {
      console.error('Asaas API error', { 
        walletId, 
        status: response.status,
        statusText: response.statusText 
      });
      
      return {
        isValid: false,
        isActive: false,
        error: `Erro na API Asaas: ${response.status}`,
      };
    }

    const walletData = await response.json();
    const isActive = walletData.status === 'ACTIVE';

    console.log('Wallet validation successful', {
      walletId,
      isActive,
      name: walletData.name,
    });

    return {
      isValid: true,
      isActive,
      name: walletData.name,
      email: walletData.email,
      response: walletData,
    };

  } catch (error) {
    console.error('Error validating wallet with Asaas:', error);
    
    return {
      isValid: false,
      isActive: false,
      error: 'Erro de conexão com Asaas',
    };
  }
}

/**
 * Implementa retry com backoff exponencial
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}