import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
  type?: 'website' | 'product' | 'article';
}

export function SEOHead({
  title = "Colchão Magnético Terapêutico Slim Quality - Alívio de Dores e Melhor Sono",
  description = "Colchão magnético terapêutico com 240 ímãs, infravermelho longo e vibromassagem. Alívio de dores, melhora da circulação e sono profundo. Entrega em todo Brasil.",
  keywords = "colchão magnético, colchão terapêutico, magnetoterapia, alívio dores, insônia, circulação sanguínea, colchão ortopédico",
  ogImage = "https://slimquality.com.br/og-image.jpg",
  ogUrl = "https://slimquality.com.br",
  canonical = "https://slimquality.com.br",
  type = "website"
}: SEOHeadProps) {
  return (
    <Helmet>
      {/* Title único por página */}
      <title>{title}</title>
      
      {/* Meta Description (150-160 chars) */}
      <meta name="description" content={description} />
      
      {/* Keywords (secundário, mas não custa) */}
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph (Facebook/WhatsApp) */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Slim Quality" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Canonical (evita conteúdo duplicado) */}
      <link rel="canonical" href={canonical} />
      
      {/* Mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {/* Charset */}
      <meta charSet="utf-8" />
      
      {/* Language */}
      <meta httpEquiv="Content-Language" content="pt-BR" />
      
      {/* Robots */}
      <meta name="robots" content="index, follow" />
      
      {/* Author */}
      <meta name="author" content="Slim Quality" />
    </Helmet>
  );
}