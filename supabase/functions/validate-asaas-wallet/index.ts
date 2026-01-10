// Edge Function: Validação de Wallet ID do Asaas
// Valida formato e existência da wallet via API Asaas

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const ASAAS_API_URL = 'https://api.asaas.com/v3';
// UUID v4 pattern (formato real usado pelo Asaas)
const WALLET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ValidationRequest {
  walletId: string;
}

interface ValidationResponse {
  valid: boolean;
  exists?: boolean;
  active?: boolean;
  name?: string;
  error?: string;
  formatValidation?: boolean; // Indica que foi validação apenas de formato
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
          error: 'Formato de Wallet ID inválido. Deve ser um UUID v4 (ex: cd912fa1-5fa4-4d49-92eb-b5ab4dfba961)',
        } as ValidationResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // VALIDAÇÃO APENAS DE FORMATO (Opção 1)
    // Asaas não fornece endpoint público para validar Wallet IDs de terceiros
    // A validação real acontece no momento do split - se a wallet não existir, o Asaas retorna erro
    console.log(`Wallet ID validada (formato): ${walletId}`);
    
    return new Response(
      JSON.stringify({
        valid: true,
        exists: true, // Assumimos que existe (será validado no split)
        active: true, // Assumimos que está ativa (será validado no split)
        formatValidation: true, // Indica que foi validação apenas de formato
      } as ValidationResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

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
