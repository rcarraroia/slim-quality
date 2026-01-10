/**
 * Constantes de chaves de armazenamento local
 * 
 * IMPORTANTE: Estas constantes definem as chaves usadas no localStorage
 * e NUNCA devem ser alteradas sem migração de dados.
 * 
 * Todas as chaves são prefixadas com 'slim_' para evitar conflitos.
 */

export const STORAGE_KEYS = {
  /**
   * Chave para armazenar código de referência de afiliado
   * Usado para rastrear indicações durante o fluxo de cadastro
   */
  REFERRAL_CODE: 'slim_referral_code',
  
  /**
   * Chave para armazenar sessão do usuário
   */
  USER_SESSION: 'slim_user_session',
  
  /**
   * Chave para armazenar carrinho de compras
   */
  CART: 'slim_cart'
} as const;

/**
 * Padrão de validação para Wallet ID do Asaas
 * Formato: UUID v4 (8-4-4-4-12 caracteres hexadecimais)
 * 
 * Exemplo válido: cd912fa1-5fa4-4d49-92eb-b5ab4dfba961
 * 
 * Fonte: API Asaas - GET /v3/wallets/
 * Schema: WalletGetResponseDTO.id
 */
export const WALLET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Taxas de comissão do sistema de afiliados
 * 
 * Estrutura de comissões:
 * - Vendedor (quem fez a venda): 15%
 * - N1 (ascendente nível 1 - quem indicou o vendedor): 3%
 * - N2 (ascendente nível 2 - quem indicou o N1): 2%
 * - Gestores (Renum + JB): 10% (5% cada)
 * 
 * Total: 30% do valor da venda
 * 
 * Redistribuição:
 * Quando não há rede completa, os percentuais não utilizados
 * são redistribuídos igualmente entre os gestores.
 */
export const COMMISSION_RATES = {
  /**
   * Comissão do vendedor direto (15%)
   */
  SELLER: 0.15,
  
  /**
   * Comissão do ascendente nível 1 (3%)
   * Quem indicou o vendedor
   */
  N1: 0.03,
  
  /**
   * Comissão do ascendente nível 2 (2%)
   * Quem indicou o N1
   */
  N2: 0.02,
  
  /**
   * Comissão do gestor Renum (5% base)
   * Pode aumentar com redistribuição
   */
  RENUM: 0.05,
  
  /**
   * Comissão do gestor JB (5% base)
   * Pode aumentar com redistribuição
   */
  JB: 0.05,
  
  /**
   * Total de comissões (30%)
   * SEMPRE deve ser 30% do valor da venda
   */
  TOTAL: 0.30
} as const;

/**
 * Valida se uma string é uma chave de storage válida
 */
export function isValidStorageKey(key: string): key is keyof typeof STORAGE_KEYS {
  return Object.values(STORAGE_KEYS).includes(key as any);
}

/**
 * Valida se uma string é um Wallet ID válido do Asaas
 */
export function isValidWalletId(walletId: string): boolean {
  return WALLET_ID_PATTERN.test(walletId);
}

/**
 * Valida se a soma de comissões é exatamente 30%
 * Tolerância de 0.01 (1 centavo) para arredondamentos
 */
export function validateCommissionTotal(
  seller: number,
  n1: number,
  n2: number,
  renum: number,
  jb: number
): boolean {
  const total = seller + n1 + n2 + renum + jb;
  const diff = Math.abs(total - COMMISSION_RATES.TOTAL);
  return diff < 0.0001; // Tolerância de 0.01%
}
