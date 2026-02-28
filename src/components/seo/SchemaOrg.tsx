interface SchemaOrgProps {
  type: 'product' | 'organization' | 'faq' | 'breadcrumb' | 'localbusiness' | 'review';
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

      case 'breadcrumb':
        return {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": data || []
        };

      case 'localbusiness':
        return {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": data.name,
          "image": data.logo,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": data.address,
            "addressLocality": data.city,
            "addressRegion": data.state,
            "postalCode": data.zipCode,
            "addressCountry": "BR"
          },
          ...(data.latitude && data.longitude && {
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": data.latitude,
              "longitude": data.longitude
            }
          }),
          "url": data.url,
          "telephone": data.phone,
          ...(data.hours && { "openingHoursSpecification": data.hours })
        };

      case 'review':
        return {
          "@context": "https://schema.org",
          "@type": "Review",
          "itemReviewed": {
            "@type": "Product",
            "name": data.productName || "Colchão Magnético Slim Quality"
          },
          "author": {
            "@type": "Person",
            "name": data.authorName
          },
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": data.rating,
            "bestRating": "5"
          },
          "reviewBody": data.reviewText,
          "datePublished": data.date
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