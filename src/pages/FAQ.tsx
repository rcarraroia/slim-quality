import { SEOHead } from "@/components/seo/SEOHead";
import { FAQ } from "@/components/seo/FAQ";

export default function FAQPage() {
  return (
    <>
      <SEOHead 
        title="Perguntas Frequentes | Colchão Magnético Slim Quality"
        description="Tire suas dúvidas sobre colchões magnéticos terapêuticos. Como funciona a magnetoterapia, benefícios, garantia, entrega e muito mais."
        keywords="colchão magnético dúvidas, magnetoterapia como funciona, colchão terapêutico perguntas, faq colchão magnético"
        canonical="https://slimquality.com.br/faq"
        type="website"
      />
      
      <div className="container py-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-center mb-4">
            Perguntas Frequentes
          </h1>
          <p className="text-xl text-muted-foreground text-center mb-12">
            Tudo o que você precisa saber sobre nossos colchões magnéticos
          </p>
          
          <FAQ />
        </div>
      </div>
    </>
  );
}
