// Edge Function: Validação de Wallet ID do Asaas
// Valida formato e existência da wallet via API Asaas

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const ASAAS_API_URL = 'https://api.asaas.com/v3';
const WALLET_ID_PATTERN = /^wal_[a-zA-Z0-9]{20}$/;

interface ValidationRequest {
  walletId: string;
}

interface ValidationResponse {
  valid: boolean;
  exists?: boolean;
  active?: boolean;
  name?: string;
  error?: string;
  fallbackMode?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { walletId }: ValidationRequest = await req.json();

    // Validação de formato
    if (!walletId || typeof walletId !== 'string') {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Wallet ID é obrigatório',
        } as ValidationResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar formato do Wallet ID
    if (!WALLET_ID_PATTERN.test(walletId)) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Formato de Wallet ID inválido. Deve ser: wal_XXXXXXXXXXXXXXXXXXXX',
        } as ValidationResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Buscar API Key do Asaas das variáveis de ambiente
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    
    if (!asaasApiKey) {
      console.error('ASAAS_API_KEY não configurada');
      // Fallback: aceitar temporariamente se formato está correto
      return new Response(
        JSON.stringify({
          valid: true,
          fallbackMode: true,
          error: 'Validação temporária - API Key não configurada',
        } as ValidationResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Chamar API Asaas para validar wallet
    try {
      const response = await fetch(`${ASAAS_API_URL}/wallets/${walletId}`, {
        method: 'GET',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return new Response(
          JSON.stringify({
            valid: false,
            exists: false,
            error: 'Wallet ID não encontrada no Asaas',
          } as ValidationResponse),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!response.ok) {
        throw new Error(`Asaas API error: ${response.status}`);
      }

      const walletData = await response.json();

      // Validar se wallet está ativa
      const isActive = walletData.status === 'ACTIVE' || walletData.status === 'APPROVED';

      return new Response(
        JSON.stringify({
          valid: true,
          exists: true,
          active: isActive,
          name: walletData.name || walletData.ownerName,
        } as ValidationResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (apiError) {
      console.error('Erro ao chamar API Asaas:', apiError);
      
      // Fallback em caso de erro de rede
      return new Response(
        JSON.stringify({
          valid: true,
          fallbackMode: true,
          error: 'Erro ao validar com Asaas - validação temporária aplicada',
        } as ValidationResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Erro na Edge Function:', error);
    
    return new Response(
      JSON.stringify({
        valid: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      } as ValidationResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
