import { SEOHead } from "@/components/seo/SEOHead";
import { SchemaOrg } from "@/components/seo/SchemaOrg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Heart, Zap, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function DorNasCostas() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Colchão Magnético para Dor nas Costas - Alívio Comprovado",
    "description": "Solução natural e eficaz para dores lombares e cervicais. Magnetoterapia com resultados comprovados em 30 dias.",
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
        title="Colchão Magnético para Dor nas Costas | Alívio Comprovado | Slim Quality"
        description="Colchão magnético terapêutico desenvolvido especialmente para aliviar dores nas costas. 240 ímãs de 800 Gauss + infravermelho longo. Resultados em 30 dias."
        keywords="colchão para dor nas costas, colchão dor lombar, colchão dor cervical, magnetoterapia dor nas costas, alívio dor coluna"
        canonical="https://slimquality.com.br/solucoes/dor-nas-costas"
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
                Solução Natural para Dores nas Costas
              </Badge>
              <h1 className="text-5xl font-bold mb-6">
                Acorde Sem Dor nas Costas
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Colchão magnético terapêutico com 240 ímãs de 800 Gauss. 
                Alívio comprovado de dores lombares e cervicais em 30 dias.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/produtos">
                    Ver Colchões
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/blog/como-magnetoterapia-alivia-dores-nas-costas">
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
                Você Sofre com Algum Desses Problemas?
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  "Dor lombar crônica que não passa",
                  "Dor cervical ao acordar",
                  "Hérnia de disco causando desconforto",
                  "Ciática com dor irradiada",
                  "Tensão muscular constante",
                  "Dificuldade para dormir por causa da dor",
                  "Dependência de medicamentos",
                  "Limitação nas atividades diárias"
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
                Se você respondeu <strong>SIM</strong> para algum desses problemas, 
                o colchão magnético pode ser a solução que você procura.
              </p>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Como a Magnetoterapia Alivia Suas Dores
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <Card>
                  <CardHeader>
                    <Heart className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Melhora a Circulação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Os 240 ímãs de 800 Gauss estimulam a circulação sanguínea, 
                      levando mais oxigênio e nutrientes para os tecidos inflamados.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Zap className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Relaxa os Músculos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      O campo magnético promove relaxamento profundo das fibras 
                      musculares, aliviando espasmos e contraturas.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Shield className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Reduz Inflamações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Propriedades anti-inflamatórias naturais reduzem o inchaço 
                      e a dor em articulações e músculos.
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
                    <div className="text-5xl font-bold text-primary mb-2">78%</div>
                    <p className="text-muted-foreground">
                      dos usuários relatam melhora significativa em 30 dias
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-5xl font-bold text-primary mb-2">65%</div>
                    <p className="text-muted-foreground">
                      redução média na intensidade da dor
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-5xl font-bold text-primary mb-2">92%</div>
                    <p className="text-muted-foreground">
                      recomendam para amigos e familiares
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Depoimento */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-8">
                  <p className="text-lg italic mb-4">
                    "Sofria com dor lombar crônica há 15 anos. Após 3 meses usando o 
                    colchão magnético Slim Quality, minha dor praticamente desapareceu. 
                    Hoje faço caminhadas e brinco com meus netos sem limitações!"
                  </p>
                  <p className="font-semibold">— Maria Helena, 58 anos</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Tecnologias */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                8 Tecnologias Terapêuticas Integradas
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { title: "240 Ímãs de 800 Gauss", desc: "Magnetoterapia de alta potência" },
                  { title: "Infravermelho Longo", desc: "Calor terapêutico profundo" },
                  { title: "Vibromassagem", desc: "8 motores independentes" },
                  { title: "Energia Bioquântica", desc: "Equilíbrio energético" },
                  { title: "Densidade Progressiva", desc: "Suporte ideal para coluna" },
                  { title: "Cromoterapia", desc: "Terapia por cores" },
                  { title: "Perfilado High-Tech", desc: "Ergonomia avançada" },
                  { title: "Tratamento Sanitário", desc: "Antimofo e antiácaro" }
                ].map((tech, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-start gap-3 p-6">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold mb-1">{tech.title}</p>
                        <p className="text-sm text-muted-foreground">{tech.desc}</p>
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
                Pronto para Viver Sem Dor?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Invista em sua saúde e qualidade de vida. 
                15 anos de garantia e resultados comprovados.
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
