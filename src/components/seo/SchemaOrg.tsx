interface SchemaOrgProps {
  type: 'product' | 'organization' | 'faq';
  data?: any;
}

export function SchemaOrg({ type, data }: SchemaOrgProps) {
  const getSchema = () => {
    switch (type) {
      case 'product':
        return {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Colchão Magnético Terapêutico Slim Quality",
          "brand": {
            "@type": "Brand",
            "name": "Slim Quality"
          },
          "description": "Colchão com 240 ímãs de 800 Gauss, infravermelho longo, vibromassagem e mais 5 tecnologias terapêuticas",
          "image": "https://slimquality.com.br/produto-imagem.jpg",
          "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "BRL",
            "lowPrice": "3190",
            "highPrice": "4890",
            "availability": "https://schema.org/InStock"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "47"
          },
          "category": "Colchões Terapêuticos",
          "manufacturer": {
            "@type": "Organization",
            "name": "Slim Quality"
          }
        };

      case 'organization':
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Slim Quality",
          "url": "https://slimquality.com.br",
          "logo": "https://slimquality.com.br/logo.png",
          "sameAs": [
            "https://www.facebook.com/slimquality",
            "https://www.instagram.com/slimquality"
          ],
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+55-33-99838-4177",
            "contactType": "Customer Service",
            "availableLanguage": "Portuguese"
          },
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "BR",
            "addressLocality": "Brasil"
          }
        };

      case 'faq':
        return data || {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": []
        };

      default:
        return null;
    }
  };

  const schema = getSchema();

  if (!schema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema, null, 2)
      }}
    />
  );
}