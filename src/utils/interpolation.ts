/**
 * Utilitário para interpolação de variáveis em materiais de marketing.
 * Substitui placeholders como {{LINK}} e {{NOME_CLIENTE}} pelos valores reais.
 */

interface InterpolationContext {
    affiliateName?: string;
    affiliateSlug?: string;
    affiliateReferralCode?: string;
    customerName?: string;
    productUrl?: string;
    baseUrl?: string;
}

export function interpolateMaterial(
    text: string,
    context: InterpolationContext
): string {
    if (!text) return "";

    const processedCheck = text;

    // 1. Construir o Link do Afiliado
    // Prioridade: Slug > Referral Code
    const identifier = context.affiliateSlug || context.affiliateReferralCode || "";
    const baseUrl = context.baseUrl || window.location.origin;

    // Se tiver productUrl, usa ele base, senão home
    const targetUrl = context.productUrl || baseUrl;

    // Constrói o link final
    // Ex: https://slimquality.com.br/produto-x?ref=CODIGO
    // Ou: https://slimquality.com.br/slug-afiliado (se for Landing Page)

    let finalLink = "";

    if (context.affiliateSlug) {
        // Se tem slug, o link é direto: https://site.com/slug
        // Mas se for material de produto específico, talvez queira https://site.com/slug/produto?
        // Simplificação v1: Landing Page do Afiliado é a principal
        finalLink = `${baseUrl}/${context.affiliateSlug}`;

        // Se for um link de produto específico E não é a home
        if (context.productUrl && context.productUrl !== baseUrl) {
            // Adiciona ref parameter para garantir
            const separator = context.productUrl.includes('?') ? '&' : '?';
            finalLink = `${context.productUrl}${separator}ref=${context.affiliateReferralCode}`;
        }
    } else {
        // Fallback clássico: ?ref=CODIGO
        const separator = targetUrl.includes('?') ? '&' : '?';
        finalLink = `${targetUrl}${separator}ref=${context.affiliateReferralCode}`;
    }

    // 2. Substituições
    return processedCheck
        .replace(/{{LINK}}/g, finalLink)
        .replace(/{{NOME_AFILIADO}}/g, context.affiliateName || "")
        .replace(/{{CODIGO}}/g, context.affiliateReferralCode || "")
        .replace(/{{NOME_CLIENTE}}/g, context.customerName || "[Nome do Cliente]");
}
