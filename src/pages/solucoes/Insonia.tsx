import { SEOHead } from "@/components/seo/SEOHead";
import { SchemaOrg } from "@/components/seo/SchemaOrg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Moon, Sparkles, Brain } from "lucide-react";
import { Link } from "react-router-dom";

export default function Insonia() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Colchão Magnético para Insônia - Durma Melhor Naturalmente",
    "description": "Solução natural para insônia e problemas de sono. Infravermelho longo e magnetoterapia para noites tranquilas.",
    "author": {
      "@type": "Organization",
      "name": "Slim Quality"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Slim Quality",
      "logo": {
        "@type": "ImageObject",
        "url": "https://slimquality.com.br/logo.png"
      }
    }
  };

  return (
    <>
      <SEOHead 
        title="Colchão Magnético para Insônia | Durma Melhor Naturalmente | Slim Quality"
        description="Colchão terapêutico com infravermelho longo e magnetoterapia para combater a insônia. Melhora a qualidade do sono naturalmente, sem medicamentos."
        keywords="colchão para insônia, melhorar sono, insônia tratamento, dormir melhor, colchão terapêutico sono"
        canonical="https://slimquality.com.br/solucoes/insonia"
        type="article"
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema, null, 2)
        }}
      />

      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-20">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-4">
                Solução Natural para Insônia
              </Badge>
              <h1 className="text-5xl font-bold mb-6">
                Durma Profundamente Todas as Noites
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Colchão terapêutico com infravermelho longo e magnetoterapia. 
                Melhora a qualidade do sono naturalmente, sem medicamentos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/produtos">
                    Ver Colchões
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/blog/7-beneficios-infravermelho-longo-sono">
                    Como Funciona
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Problema Section */}
        <section className="py-16 bg-muted/50">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Você Reconhece Esses Sintomas?
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  "Demora mais de 30 minutos para adormecer",
                  "Acorda várias vezes durante a noite",
                  "Acorda cansado, mesmo após 8 horas",
                  "Depende de medicamentos para dormir",
                  "Mente acelerada na hora de dormir",
                  "Sono leve e agitado",
                  "Cansaço e irritabilidade durante o dia",
                  "Dificuldade de concentração"
                ].map((problema, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-start gap-3 p-6">
                      <CheckCircle2 className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
                      <p className="text-muted-foreground">{problema}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-center mt-8 text-lg">
                A insônia afeta <strong>73 milhões de brasileiros</strong>. 
                Você não está sozinho, e existe uma solução natural.
              </p>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Como o Colchão Magnético Melhora Seu Sono
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <Card>
                  <CardHeader>
                    <Moon className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Sono Profundo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      O infravermelho longo aumenta em 35% o tempo de sono profundo, 
                      a fase mais restauradora do sono.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Sparkles className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Relaxamento Natural</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      A magnetoterapia estimula a produção de serotonina e melatonina, 
                      hormônios essenciais para o sono.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Brain className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Reduz Ansiedade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      O campo magnético promove relaxamento mental profundo, 
                      acalmando a mente acelerada.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Resultados */}
        <section className="py-16 bg-muted/50">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Resultados Comprovados
              </h2>
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-5xl font-bold text-primary mb-2">89%</div>
                    <p className="text-muted-foreground">
                      relatam melhora significativa na qualidade do sono
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-5xl font-bold text-primary mb-2">40%</div>
                    <p className="text-muted-foreground">
                      redução nos despertares noturnos
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-5xl font-bold text-primary mb-2">78%</div>
                    <p className="text-muted-foreground">
                      conseguiram reduzir ou eliminar medicamentos
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Depoimento */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-8">
                  <p className="text-lg italic mb-4">
                    "Sofria com insônia há anos e dependia de remédios para dormir. 
                    Após 1 mês usando o colchão Slim Quality, consegui eliminar os 
                    medicamentos e durmo 7-8 horas por noite. Minha vida mudou!"
                  </p>
                  <p className="font-semibold">— Carlos Eduardo, 42 anos</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Timeline de Resultados */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                O Que Esperar nas Primeiras Semanas
              </h2>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Badge>Semana 1</Badge>
                      Primeiros Sinais de Melhora
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Você começará a adormecer mais rápido e sentirá um relaxamento 
                      mais profundo ao deitar. Redução inicial nos despertares noturnos.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Badge>Semana 2-4</Badge>
                      Melhora Significativa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Sono mais profundo e restaurador. Você acordará mais descansado 
                      e com mais energia. Muitos conseguem reduzir medicamentos nesta fase.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Badge>Mês 2-3</Badge>
                      Resultados Máximos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Padrão de sono normalizado. Você dormirá naturalmente, sem 
                      medicamentos, e acordará revigorado todas as manhãs.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Benefícios Adicionais */}
        <section className="py-16 bg-muted/50">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Benefícios Além do Sono
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { title: "Mais Energia", desc: "Aumento de 45% na disposição diária" },
                  { title: "Melhor Humor", desc: "Redução de irritabilidade e ansiedade" },
                  { title: "Concentração", desc: "Melhora na memória e foco" },
                  { title: "Imunidade", desc: "Fortalecimento do sistema imunológico" },
                  { title: "Produtividade", desc: "Aumento de 40% no rendimento" },
                  { title: "Qualidade de Vida", desc: "Bem-estar geral melhorado" }
                ].map((benefit, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-start gap-3 p-6">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold mb-1">{benefit.title}</p>
                        <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6">
                Pronto para Dormir Melhor?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Pare de sofrer com insônia. Invista em noites tranquilas e 
                dias produtivos. Sem medicamentos, sem efeitos colaterais.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/produtos">
                    Ver Todos os Modelos
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                  <Link to="/lojas">
                    Encontrar Loja Parceira
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
