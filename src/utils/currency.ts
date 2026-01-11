/**
 * Utilitários para conversão e formatação de valores monetários
 * 
 * IMPORTANTE: O banco de dados armazena valores em CENTAVOS (integer)
 * para evitar problemas de precisão com decimais.
 * 
 * Exemplos:
 * - R$ 493,50 no banco = 49350 (integer)
 * - R$ 3.290,00 no banco = 329000 (integer)
 */

/**
 * Converte valor em centavos para decimal
 * @param cents Valor em centavos (integer)
 * @returns Valor em reais (decimal)
 * @example centsToDecimal(49350) // 493.50
 */
export function centsToDecimal(cents: number): number {
  if (cents === null || cents === undefined) return 0;
  return cents / 100;
}

/**
 * Converte valor decimal para centavos
 * @param decimal Valor em reais (decimal)
 * @returns Valor em centavos (integer)
 * @example decimalToCents(493.50) // 49350
 */
export function decimalToCents(decimal: number): number {
  if (decimal === null || decimal === undefined) return 0;
  return Math.round(decimal * 100);
}

/**
 * Formata valor em centavos para exibição
 * @param cents Valor em centavos
 * @returns String formatada (ex: "R$ 493,50")
 * @example formatCurrency(49350) // "R$ 493,50"
 */
export function formatCurrency(cents: number): string {
  const decimal = centsToDecimal(cents);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(decimal);
}

/**
 * Formata valor decimal para exibição
 * @param decimal Valor em reais (decimal)
 * @returns String formatada (ex: "R$ 493,50")
 * @example formatDecimal(493.50) // "R$ 493,50"
 */
export function formatDecimal(decimal: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(decimal);
}

/**
 * Formata valor para exibição sem símbolo de moeda
 * @param cents Valor em centavos
 * @returns String formatada (ex: "493,50")
 * @example formatNumber(49350) // "493,50"
 */
export function formatNumber(cents: number): string {
  const decimal = centsToDecimal(cents);
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(decimal);
}
