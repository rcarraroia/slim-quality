import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SchemaOrg } from './SchemaOrg';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "Colchão magnético realmente funciona para dores?",
    answer: "Sim. A magnetoterapia é reconhecida pela OMS e diversos estudos científicos comprovam sua eficácia no alívio de dores crônicas, melhora da circulação sanguínea e redução de inflamações. Nosso colchão possui 240 ímãs de 800 Gauss que geram um campo magnético terapêutico durante o sono."
  },
  {
    question: "Quanto tempo leva para sentir os benefícios?",
    answer: "Os primeiros benefícios podem ser sentidos já nas primeiras noites, como melhora na qualidade do sono. Para dores crônicas e problemas circulatórios, recomendamos uso contínuo por 30 a 60 dias para resultados mais significativos."
  },
  {
    question: "O colchão magnético tem contraindicações?",
    answer: "Sim. Não recomendamos para pessoas com marcapasso, bombas de insulina, próteses metálicas recentes, gestantes ou crianças menores de 12 anos. Sempre consulte seu médico antes de usar terapias magnéticas."
  },
  {
    question: "Qual a diferença entre colchão magnético e ortopédico comum?",
    answer: "O colchão ortopédico comum oferece apenas suporte postural. Nosso colchão magnético combina 8 tecnologias: magnetoterapia, infravermelho longo, vibromassagem, energia bioquântica, densidade progressiva, cromoterapia, perfilado high-tech e tratamento sanitário."
  },
  {
    question: "Como funciona a garantia e entrega?",
    answer: "Oferecemos garantia de 10 anos contra defeitos de fabricação e 30 dias para teste em casa. A entrega é feita em todo Brasil via transportadora especializada, com prazo de 7 a 15 dias úteis dependendo da região."
  },
  {
    question: "Posso usar o colchão magnético se tenho fibromialgia?",
    answer: "Muitos clientes com fibromialgia relatam melhora significativa nas dores e qualidade do sono. A magnetoterapia ajuda a reduzir a inflamação e melhorar a circulação, beneficiando os sintomas da fibromialgia. Recomendamos consultar seu reumatologista."
  },
  {
    question: "O colchão magnético ajuda com insônia?",
    answer: "Sim. O infravermelho longo e a magnetoterapia promovem relaxamento profundo, reduzem o estresse e equilibram o sistema nervoso, facilitando o adormecer e proporcionando sono mais reparador."
  },
  {
    question: "Qual tamanho escolher para meu quarto?",
    answer: "Oferecemos 4 tamanhos: Solteiro (88x188cm), Padrão/Casal (138x188cm), Queen (158x198cm) e King (193x203cm). O mais vendido é o Padrão. Considere o espaço do quarto e se dormem 1 ou 2 pessoas."
  }
];

export function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Schema para FAQ
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <section id="faq" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
            Perguntas Frequentes
          </h2>
          
          <div className="space-y-4">
            {faqData.map((item, index) => (
              <div 
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <button
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                  onClick={() => toggleItem(index)}
                >
                  <h3 
                    className="font-semibold text-gray-900 pr-4"
                    itemProp="name"
                  >
                    {item.question}
                  </h3>
                  {openItems.includes(index) ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                
                {openItems.includes(index) && (
                  <div 
                    className="px-6 pb-4"
                    itemScope
                    itemProp="acceptedAnswer"
                    itemType="https://schema.org/Answer"
                  >
                    <p 
                      className="text-gray-700 leading-relaxed"
                      itemProp="text"
                    >
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Schema.org JSON-LD */}
      <SchemaOrg type="faq" data={faqSchema} />
    </section>
  );
}