import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Sobre = () => {
  const technologies = [
    {
      id: "magnetico",
      icon: "🧲",
      title: "Sistema Magnético - 240 Ímãs de 800 Gauss",
      whatIs: "Sistema com 240 ímãs de neodímio estrategicamente posicionados ao longo do colchão, criando um campo magnético terapêutico constante.",
      howWorks: "Os ímãs interagem com o ferro presente no sangue, melhorando a circulação e oxigenação dos tecidos. O campo magnético estimula processos naturais de regeneração celular.",
      benefits: [
        "Dores na coluna (cervical, lombar, torácica)",
        "Problemas circulatórios e varizes",
        "Câimbras noturnas e pernas pesadas",
        "Fadiga muscular e fibromialgia",
        "Processos inflamatórios",
      ],
      indicatedFor: "Pessoas com dores crônicas, má circulação, artrite, fibromialgia e problemas musculares.",
    },
    {
      id: "infravermelho",
      icon: "🌡️",
      title: "Infravermelho Longo",
      whatIs: "Emissão de raios infravermelhos de ondas longas que penetram profundamente na pele, aquecendo o corpo de dentro para fora.",
      howWorks: "Ondas infravermelhas aquecem suavemente os tecidos profundos, estimulando células, melhorando metabolismo e promovendo relaxamento natural.",
      benefits: [
        "Insônia e distúrbios do sono",
        "Estresse e tensão",
        "Recuperação celular acelerada",
        "Fadiga crônica",
        "Envelhecimento precoce",
      ],
      indicatedFor: "Quem sofre de insônia, estresse crônico, fadiga ou busca rejuvenescimento.",
    },
    {
      id: "bioquantica",
      icon: "⚡",
      title: "Energia Bioquântica",
      whatIs: "Tecnologia que trabalha com frequências energéticas naturais do corpo, reequilibrando o campo bioelétrico celular.",
      howWorks: "Frequências específicas harmonizam a energia vital do corpo, fortalecendo sistema imunológico e reduzindo desequilíbrios energéticos.",
      benefits: [
        "Insônia e sono não reparador",
        "Ansiedade e estresse",
        "Cansaço extremo e fadiga mental",
        "Baixa imunidade",
        "Desequilíbrio emocional",
      ],
      indicatedFor: "Pessoas com esgotamento mental, ansiedade, baixa energia ou sistema imunológico fragilizado.",
    },
    {
      id: "vibromassagem",
      icon: "📳",
      title: "Vibromassagem - 8 Motores",
      whatIs: "Sistema de 8 motores silenciosos distribuídos estrategicamente, proporcionando massagem relaxante em pontos específicos do corpo.",
      howWorks: "Vibrações suaves massageiam músculos tensos, melhoram circulação local e promovem relaxamento profundo antes do sono.",
      benefits: [
        "Tensão muscular e contraturas",
        "Estresse e ansiedade",
        "Dores lombares e nas costas",
        "Insônia causada por tensão",
        "Má circulação",
      ],
      indicatedFor: "Quem tem tensão muscular, trabalha sentado/em pé o dia todo ou sofre com estresse.",
    },
    {
      id: "densidade",
      icon: "🔷",
      title: "Densidade Progressiva",
      whatIs: "Sistema de 7 camadas de espumas com densidades diferentes, cada uma com função específica para suporte e conforto ideal.",
      howWorks: "Cada camada trabalha em harmonia: suporte na base, adaptação no meio e conforto na superfície, distribuindo peso uniformemente.",
      benefits: [
        "Problemas de coluna e postura",
        "Dores ao acordar",
        "Pontos de pressão",
        "Desalinhamento da coluna",
        "Suporte para peso elevado",
      ],
      indicatedFor: "Pessoas com problemas de coluna, má postura, dores ao acordar ou que precisam de suporte extra.",
    },
    {
      id: "cromoterapia",
      icon: "🌈",
      title: "Cromoterapia",
      whatIs: "Utilização de cores terapêuticas integradas nas camadas do colchão, emitindo frequências que influenciam bem-estar físico e mental.",
      howWorks: "Cada cor emite frequências específicas que interagem com corpo e mente, promovendo equilíbrio emocional e relaxamento.",
      benefits: [
        "Ansiedade e depressão leve",
        "Distúrbios do sono",
        "Estresse emocional",
        "Irritabilidade",
        "Desequilíbrio emocional",
      ],
      indicatedFor: "Quem sofre com ansiedade, depressão, estresse emocional ou busca equilíbrio mental.",
    },
    {
      id: "perfilado",
      icon: "📐",
      title: "Perfilado High-Tech",
      whatIs: "Design ergonômico com relevos anatômicos que se adaptam perfeitamente às curvas naturais do corpo.",
      howWorks: "Formato perfilado distribui pressão uniformemente, mantém coluna alinhada e reduz pontos de tensão durante o sono.",
      benefits: [
        "Hérnia de disco",
        "Escoliose, cifose e lordose",
        "Problemas posturais",
        "Pontos de pressão",
        "Desconforto ao dormir",
      ],
      indicatedFor: "Pessoas com hérnia de disco, escoliose, problemas posturais ou que sentem desconforto ao dormir.",
    },
    {
      id: "sanitario",
      icon: "🦠",
      title: "Tratamento Sanitário",
      whatIs: "Tratamento químico permanente aplicado em todas as camadas, criando barreira contra ácaros, fungos e bactérias.",
      howWorks: "Agentes antimicrobianos impedem proliferação de microorganismos, mantendo colchão sempre higiênico e livre de alérgenos.",
      benefits: [
        "Alergias respiratórias",
        "Rinite e asma",
        "Sensibilidade a ácaros",
        "Problemas de pele",
        "Ambiente insalubre",
      ],
      indicatedFor: "Alérgicos, asmáticos, pessoas com rinite ou que buscam ambiente mais higiênico e saudável.",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="container px-4 py-24">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-6xl md:text-7xl font-bold leading-tight">
            8 Tecnologias. 1 Objetivo: Seu Bem-Estar
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Conheça a ciência por trás da transformação do seu sono
          </p>
        </div>
      </section>

      {/* As 8 Tecnologias - Layout Zigzag */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="space-y-32">
            {technologies.map((tech, index) => (
              <div 
                key={index}
                id={tech.id}
                className={`grid md:grid-cols-2 gap-16 items-center ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted'
                } py-16 px-8 rounded-2xl`}
              >
                <div className={`${index % 2 === 1 ? 'md:order-2' : ''}`}>
                  <div className="aspect-square bg-background rounded-2xl flex items-center justify-center shadow-lg border">
                    <div className="text-center">
                      <div className="text-9xl mb-4">{tech.icon}</div>
                      <p className="text-sm text-muted-foreground">Representação visual</p>
                    </div>
                  </div>
                </div>
                <div className={`space-y-6 ${index % 2 === 1 ? 'md:order-1' : ''}`}>
                  <div>
                    <div className="text-5xl mb-4">{tech.icon}</div>
                    <h3 className="text-3xl md:text-4xl font-bold mb-6">{tech.title}</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">O que é:</h4>
                        <p className="text-muted-foreground text-lg leading-relaxed">{tech.whatIs}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Como funciona:</h4>
                        <p className="text-muted-foreground text-lg leading-relaxed">{tech.howWorks}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-3">Resolve:</h4>
                    <ul className="space-y-3">
                      {tech.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="h-6 w-6 text-success shrink-0 mt-0.5" />
                          <span className="text-lg">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-primary/10 border-l-4 border-primary p-6 rounded-lg">
                    <p className="font-semibold text-lg mb-2">Indicado para:</p>
                    <p className="text-muted-foreground text-lg">{tech.indicatedFor}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20 py-24">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Todos os Nossos Modelos Incluem Estas 8 Tecnologias
            </h2>
            <p className="text-xl text-muted-foreground">
              Sem custos adicionais. Terapia completa em todos os tamanhos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/produtos">
                <Button size="lg" className="text-lg px-10 py-7">
                  Ver Modelos Disponíveis
                </Button>
              </Link>
              <Button 
                asChild 
                size="lg" 
                variant="outline"
                className="text-lg px-10 py-7"
              >
                <a 
                  href="https://wa.me/5533998384177?text=Olá%20BIA!%20Quero%20saber%20mais%20sobre%20as%20tecnologias%20Slim%20Quality"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Falar com a BIA
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Sobre;
