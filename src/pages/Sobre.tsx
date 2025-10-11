import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const technologies = [
  {
    icon: "🧲",
    title: "Sistema Magnético - 240 Ímãs",
    what: "Sistema com 240 ímãs de neodímio de 800 Gauss estrategicamente posicionados",
    how: "Os ímãs criam um campo magnético que interage com o ferro presente no sangue, melhorando a circulação",
    benefits: [
      "Melhora circulação sanguínea em até 30%",
      "Reduz processos inflamatórios",
      "Acelera recuperação muscular",
      "Melhora oxigenação dos tecidos"
    ],
    indicated: ["Dores musculares", "Má circulação", "Artrite", "Fibromialgia"]
  },
  {
    icon: "🌡️",
    title: "Infravermelho Longo",
    what: "Emissão de raios infravermelhos de ondas longas que penetram profundamente na pele",
    how: "Ondas infravermelhas aquecem o corpo de dentro para fora, estimulando células e tecidos",
    benefits: [
      "Acelera recuperação celular",
      "Melhora qualidade do sono",
      "Aumenta produção de colágeno",
      "Elimina toxinas pela transpiração"
    ],
    indicated: ["Insônia", "Estresse", "Envelhecimento precoce", "Fadiga crônica"]
  },
  {
    icon: "⚡",
    title: "Energia Bioquântica",
    what: "Tecnologia que trabalha com frequências energéticas naturais do corpo",
    how: "Reequilibra o campo energético celular através de frequências específicas",
    benefits: [
      "Equilibra energia vital",
      "Reduz fadiga mental",
      "Melhora disposição",
      "Fortalece sistema imunológico"
    ],
    indicated: ["Cansaço extremo", "Baixa imunidade", "Estresse", "Ansiedade"]
  },
  {
    icon: "📳",
    title: "Vibromassagem - 8 Motores",
    what: "Sistema de 8 motores silenciosos distribuídos estrategicamente no colchão",
    how: "Vibrações suaves massageiam pontos específicos promovendo relaxamento profundo",
    benefits: [
      "Relaxamento muscular profundo",
      "Reduz tensão e estresse",
      "Melhora qualidade do sono",
      "Alivia dores lombares"
    ],
    indicated: ["Tensão muscular", "Estresse", "Insônia", "Dores nas costas"]
  },
  {
    icon: "🔷",
    title: "Densidade Progressiva",
    what: "7 camadas de espumas com densidades diferentes trabalhando em harmonia",
    how: "Cada camada tem função específica: suporte, conforto, ventilação e adaptação",
    benefits: [
      "Distribuição perfeita do peso",
      "Alinhamento correto da coluna",
      "Conforto personalizado",
      "Maior durabilidade"
    ],
    indicated: ["Problemas de coluna", "Má postura", "Dores ao acordar", "Peso elevado"]
  },
  {
    icon: "🌈",
    title: "Cromoterapia",
    what: "Utilização de cores terapêuticas integradas nas camadas do colchão",
    how: "Cores específicas emitem frequências que influenciam bem-estar físico e mental",
    benefits: [
      "Equilíbrio emocional",
      "Melhora humor",
      "Reduz ansiedade",
      "Promove relaxamento"
    ],
    indicated: ["Ansiedade", "Depressão", "Estresse", "Insônia"]
  },
  {
    icon: "📐",
    title: "Perfilado Rabatan",
    what: "Design ergonômico com relevos que se adaptam perfeitamente ao corpo",
    how: "Formato perfilado distribui pressão uniformemente e mantém coluna alinhada",
    benefits: [
      "Alinhamento perfeito da coluna",
      "Reduz pontos de pressão",
      "Melhora circulação",
      "Previne dores"
    ],
    indicated: ["Hérnia de disco", "Escoliose", "Cifose", "Lordose"]
  },
  {
    icon: "🦠",
    title: "Tratamento Sanitário",
    what: "Tratamento químico permanente aplicado em todas as camadas do colchão",
    how: "Agentes antimicrobianos impedem proliferação de ácaros, fungos e bactérias",
    benefits: [
      "Proteção contra ácaros",
      "Previne alergias",
      "Ambiente mais saudável",
      "Maior higiene"
    ],
    indicated: ["Alergias", "Rinite", "Asma", "Problemas respiratórios"]
  }
];

const certifications = [
  { name: "INMETRO", description: "Certificação Nacional" },
  { name: "ISO 9001", description: "Qualidade Internacional" },
  { name: "Anvisa", description: "Registro Sanitário" },
  { name: "ABNT", description: "Normas Técnicas" }
];

export default function Sobre() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/20 via-secondary/20 to-background py-24">
        <div className="container px-4 text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Inovação e Tecnologia Para Seu Bem-Estar
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Conheça a ciência por trás dos colchões Slim Quality
          </p>
        </div>
      </section>

      {/* Company Story */}
      <section className="container px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold">Nossa História</h2>
            <p className="text-muted-foreground leading-relaxed">
              A Slim Quality nasceu da união entre conhecimento científico e paixão por bem-estar. 
              Com mais de 15 anos de experiência, desenvolvemos colchões que vão além do simples descanso.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Nossa missão é transformar vidas através do sono terapêutico, combinando 8 tecnologias 
              exclusivas que trabalham em sinergia para promover saúde, conforto e qualidade de vida.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Cada colchão é resultado de anos de pesquisa e desenvolvimento, fabricado com materiais 
              de primeira qualidade e testado rigorosamente para garantir máxima eficácia terapêutica.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Hoje, milhares de brasileiros confiam na Slim Quality para renovar suas noites e 
              transformar suas manhãs. Nossa garantia de 15 anos reflete nossa confiança na 
              durabilidade e qualidade de nossos produtos.
            </p>
          </div>
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-6xl mb-4">🏭</div>
              <p>Imagem: Fábrica ou instalações</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technologies Deep Dive */}
      <section className="bg-muted py-16">
        <div className="container px-4">
          <h2 className="text-4xl font-bold text-center mb-4">
            As 8 Tecnologias Explicadas
          </h2>
          <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
            Cada tecnologia foi cuidadosamente desenvolvida e integrada para trabalhar em sinergia
          </p>

          <div className="space-y-24">
            {technologies.map((tech, index) => (
              <div 
                key={index}
                className={`grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto`}
              >
                <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <Card className="h-full">
                    <CardContent className="p-8">
                      <div className="aspect-square bg-background rounded-lg flex items-center justify-center text-9xl mb-6">
                        {tech.icon}
                      </div>
                      {tech.indicated && (
                        <div>
                          <h4 className="font-semibold mb-3">Indicado para:</h4>
                          <div className="flex flex-wrap gap-2">
                            {tech.indicated.map((condition, i) => (
                              <Badge key={i} variant="secondary">{condition}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className={`space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div>
                    <div className="text-5xl mb-4">{tech.icon}</div>
                    <h3 className="text-3xl font-bold mb-6">{tech.title}</h3>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-primary">O que é?</h4>
                    <p className="text-muted-foreground">{tech.what}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-primary">Como funciona?</h4>
                    <p className="text-muted-foreground">{tech.how}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-3 text-primary">Benefícios clínicos:</h4>
                    <ul className="space-y-3">
                      {tech.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="container px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">
          Certificações e Qualidade
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {certifications.map((cert, index) => (
            <Card key={index}>
              <CardContent className="p-8 text-center space-y-4">
                <div className="h-20 w-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🏆</span>
                </div>
                <h3 className="font-bold text-lg">{cert.name}</h3>
                <p className="text-sm text-muted-foreground">{cert.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-primary to-secondary py-16">
        <div className="container px-4 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Pronto Para Conhecer Nossos Produtos?
          </h2>
          <Button 
            asChild 
            size="lg" 
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90"
          >
            <Link to="/">Ver Produtos</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
