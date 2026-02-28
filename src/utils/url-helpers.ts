/**
 * Utilitários para sanitização e formatação de URLs
 */

/**
 * Sanitiza URLs de redes sociais e websites
 * Detecta se o valor já é uma URL completa ou apenas username
 * 
 * @param value - Username ou URL completa
 * @param platform - Plataforma (instagram, facebook, tiktok, website)
 * @returns URL completa e válida
 * 
 * @example
 * sanitizeUrl('usuario', 'instagram') // https://instagram.com/usuario
 * sanitizeUrl('https://instagram.com/usuario', 'instagram') // https://instagram.com/usuario
 * sanitizeUrl('@usuario', 'instagram') // https://instagram.com/usuario
 */
export function sanitizeUrl(
  value: string | undefined | null,
  platform: 'instagram' | 'facebook' | 'tiktok' | 'website'
): string {
  if (!value) return '';

  // Remove espaços em branco
  const trimmedValue = value.trim();

  // Se já é URL completa (começa com http:// ou https://), retorna diretamente
  if (trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')) {
    return trimmedValue;
  }

  // Remove @ do início se houver (comum em Instagram/TikTok)
  const cleanValue = trimmedValue.replace(/^@/, '');

  // Adiciona prefixo apropriado baseado na plataforma
  const prefixes: Record<typeof platform, string> = {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    tiktok: 'https://tiktok.com/@',
    website: 'https://'
  };

  return prefixes[platform] + cleanValue;
}

/**
 * Formata número de telefone para WhatsApp
 * Remove caracteres não numéricos
 * 
 * @param phone - Número de telefone
 * @returns Número formatado para WhatsApp (apenas dígitos)
 * 
 * @example
 * formatWhatsAppNumber('(11) 98765-4321') // 11987654321
 * formatWhatsAppNumber('+55 11 98765-4321') // 5511987654321
 */
export function formatWhatsAppNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  return phone.replace(/\D/g, '');
}

/**
 * Formata preço em centavos para exibição
 * 
 * @param priceCents - Preço em centavos
 * @returns Preço formatado (ex: "R$ 3.290,00")
 * 
 * @example
 * formatPrice(329000) // "R$ 3.290,00"
 * formatPrice(0) // "R$ 0,00"
 */
export function formatPrice(priceCents: number | undefined | null): string {
  if (priceCents === undefined || priceCents === null) return 'R$ 0,00';
  
  const priceReais = priceCents / 100;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(priceReais);
}
