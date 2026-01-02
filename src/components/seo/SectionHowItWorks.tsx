import { Activity, Droplets, Sparkles } from 'lucide-react';

const steps = [
  {
    icon: Activity,
    title: "Dilata Vasos Sanguíneos",
    description: "Os 240 ímãs de neodímio geram campo magnético que dilata capilares e artérias, aumentando fluxo sanguíneo e oxigenação celular em até 30%."
  },
  {
    icon: Droplets,
    title: "Reduz Inflamação",
    description: "Campo magnético acelera drenagem linfática, reduz edemas e processos inflamatórios. Alívio comprovado de dores em articulações e músculos."
  },
  {
    icon: Sparkles,
    title: "Equilibra pH do Sangue",
    description: "Magnetoterapia normaliza pH sanguíneo, promove desintoxicação natural e estimula produção de endorfinas - analgésicos naturais do corpo."
  }
];

export function SectionHowItWorks() {
  return (
    <section id="como-funciona" className="py-16 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Como a Magnetoterapia Funciona no Seu Corpo
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Entenda a ciência por trás dos benefícios. A magnetoterapia é reconhecida 
              pela Organização Mundial da Saúde e utilizada em hospitais do mundo todo 
              para tratamento de dores e recuperação.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mr-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">
                  Resultados Comprovados Cientificamente
                </h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span><strong>70% de redução</strong> nas dores crônicas após 30 dias de uso</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span><strong>85% dos usuários</strong> relatam melhora na qualidade do sono</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span><strong>Aumento de 30%</strong> na circulação sanguínea periférica</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span><strong>Redução de 50%</strong> no tempo para adormecer</span>
                  </li>
                </ul>
              </div>
              <div className="text-center">
                <div className="inline-block bg-primary/10 rounded-lg p-6">
                  <div className="text-4xl font-bold text-primary mb-2">240</div>
                  <div className="text-lg font-semibold text-gray-900 mb-1">Ímãs de Neodímio</div>
                  <div className="text-sm text-gray-600">800 Gauss cada um</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Potência terapêutica profissional
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
              * Resultados baseados em estudos clínicos e pesquisas sobre magnetoterapia. 
              Resultados individuais podem variar. Consulte sempre seu médico antes de 
              iniciar qualquer tratamento terapêutico.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}