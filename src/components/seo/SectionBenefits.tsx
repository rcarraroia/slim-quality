import { Heart, Moon, Zap, Shield } from 'lucide-react';

const benefits = [
  {
    icon: Heart,
    title: "Alívio de Dores Crônicas",
    description: "Magnetoterapia comprovada para artrite, fibromialgia, dores nas costas e articulações. Os 240 ímãs de 800 Gauss reduzem inflamação e promovem regeneração celular."
  },
  {
    icon: Zap,
    title: "Melhora da Circulação Sanguínea",
    description: "Campo magnético dilata vasos sanguíneos, aumenta oxigenação dos tecidos e acelera eliminação de toxinas. Ideal para problemas circulatórios e varizes."
  },
  {
    icon: Moon,
    title: "Sono Profundo e Reparador",
    description: "Infravermelho longo e vibromassagem promovem relaxamento profundo, reduzem estresse e equilibram sistema nervoso. Desperte mais descansado e revigorado."
  },
  {
    icon: Shield,
    title: "Regeneração e Bem-Estar",
    description: "Energia bioquântica e cromoterapia estimulam processos naturais de cura, fortalecem sistema imunológico e promovem equilíbrio energético do organismo."
  }
];

export function SectionBenefits() {
  return (
    <section id="beneficios" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Por Que Escolher Nosso Colchão Magnético Terapêutico?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nosso colchão terapêutico combina 8 tecnologias comprovadas cientificamente 
              para transformar sua saúde enquanto você dorme. Descubra os benefícios únicos 
              da magnetoterapia profissional.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 bg-gray-50 rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4 text-center text-gray-900">
              Tecnologias Integradas em Um Só Colchão
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div className="bg-white p-4 rounded-lg">
                <div className="font-semibold text-primary">240 Ímãs</div>
                <div className="text-sm text-gray-600">800 Gauss cada</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="font-semibold text-primary">8 Motores</div>
                <div className="text-sm text-gray-600">Vibromassagem</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="font-semibold text-primary">Infravermelho</div>
                <div className="text-sm text-gray-600">Longo Alcance</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="font-semibold text-primary">Cromoterapia</div>
                <div className="text-sm text-gray-600">7 Cores Terapêuticas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}