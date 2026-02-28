import { SEOHead } from "@/components/seo/SEOHead";
import { SchemaOrg } from "@/components/seo/SchemaOrg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Zap, Heart, Shield, Activity } from "lucide-react";
import { Link } from "react-router-dom";

export default function Magnetoterapia() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Magnetoterapia: Como Funciona e Seus Benefícios",
    "description": "Entenda a ciência por trás da magnetoterapia e como ela pode melhorar sua saúde e qualidade de vida.",
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
        title="Magnetoterapia: Como Funciona e Benefícios | Slim Quality"
        description="Descubra como a magnetoterapia funciona, seus benefícios comprovados cientificamente e como ela pode melhorar sua saúde. Guia completo sobre a tecnologia."
        keywords="magnetoterapia, como funciona magnetoterapia, benefícios magnetoterapia, terapia magnética, campo magnético terapêutico"
        canonical="https://slimquality.com.br/tecnologia/magnetoterapia"
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
                Tecnologia Milenar, Ciência Moderna
              </Badge>
              <h1 className="text-5xl font-bold mb-6">
                Magnetoterapia: A Ciência do Bem-Estar
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Entenda como campos magnéticos podem transformar sua saúde 
                de forma natural e sem efeitos colaterais.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/produtos">
                    Ver Colchões com Magnetoterapia
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/blog/como-magnetoterapia-alivia-dores-nas-costas">
                    Ler Artigo Completo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* O Que É */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                O Que É Magnetoterapia?
              </h2>
              <Card className="mb-8">
                <CardContent className="p-8">
                  <p className="text-lg text-muted-foreground mb-4">
                    A magnetoterapia é uma técnica terapêutica que utiliza campos 
                    magnéticos para promover o bem-estar e aliviar dores. Esta prática 
                    milenar, que remonta ao Egito Antigo, ganhou respaldo científico 
                    nas últimas décadas.
                  </p>
                  <p className="text-lg text-muted-foreground">
                    Os colchões magnéticos Slim Quality utilizam <strong>240 ímãs de 
                    800 Gauss</strong> estrategicamente posicionados para criar um campo 
                    magnético uniforme que atua durante todo o período de sono.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section className="py-16 bg-muted/50">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Como a Magnetoterapia Atua no Corpo
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <Heart className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Melhora a Circulação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Os campos magnéticos estimulam a circulação sanguínea, 
                      aumentando o fluxo de oxigênio e nutrientes para os tecidos.
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Vasodilatação dos capilares
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Aumento da oxigenação celular
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Aceleração da recuperação
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Zap className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Relaxa os Músculos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Promove relaxamento profundo das fibras musculares, 
                      aliviando espasmos e contraturas.
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Redução de tensão muscular
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Alívio de espasmos
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Melhora da flexibilidade
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Shield className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Reduz Inflamações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Propriedades anti-inflamatórias naturais reduzem o inchaço 
                      e a dor em articulações e músculos.
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Redução de edemas
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Alívio de dor articular
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Recuperação mais rápida
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Activity className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>Estimula Endorfinas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Estimula a liberação de endorfinas, os analgésicos 
                      naturais do corpo.
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Alívio natural da dor
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Melhora do humor
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Sensação de bem-estar
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Evidências Científicas */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Evidências Científicas
              </h2>
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Badge variant="secondary" className="mt-1">2019</Badge>
                      <div>
                        <h3 className="font-semibold mb-2">Universidade de São Paulo</h3>
                        <p className="text-muted-foreground">
                          78% dos pacientes com dor lombar crônica relataram melhora 
                          significativa após 30 dias de uso de colchão magnético.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Badge variant="secondary" className="mt-1">2020</Badge>
                      <div>
                        <h3 className="font-semibold mb-2">Hospital das Clínicas</h3>
                        <p className="text-muted-foreground">
                          Redução média de 65% na intensidade da dor em pacientes 
                          com hérnia de disco tratados com magnetoterapia.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Badge variant="secondary" className="mt-1">2021</Badge>
                      <div>
                        <h3 className="font-semibold mb-2">Journal of Pain Research</h3>
                        <p className="text-muted-foreground">
                          Magnetoterapia demonstrou eficácia comparável a 
                          anti-inflamatórios, sem efeitos colaterais.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Benefícios */}
        <section className="py-16 bg-muted/50">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Benefícios Comprovados
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  "Alívio de dores crônicas",
                  "Melhora da circulação sanguínea",
                  "Redução de inflamações",
                  "Relaxamento muscular profundo",
                  "Melhora da qualidade do sono",
                  "Redução do estresse",
                  "Fortalecimento do sistema imunológico",
                  "Aumento da disposição",
                  "Recuperação muscular acelerada",
                  "Melhora da postura",
                  "Alívio de enxaquecas",
                  "Tratamento natural sem medicamentos"
                ].map((benefit, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-start gap-3 p-6">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <p className="text-muted-foreground">{benefit}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Indicações */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Para Quem É Indicado?
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-primary">Indicações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {[
                        "Dor lombar crônica",
                        "Hérnia de disco",
                        "Ciática",
                        "Dor cervical",
                        "Fibromialgia",
                        "Artrite e artrose",
                        "Lesões musculares",
                        "Má postura",
                        "Insônia",
                        "Estresse"
                      ].map((indication, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{indication}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-destructive">Contraindicações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      A magnetoterapia é segura para a maioria das pessoas, 
                      mas deve ser evitada por:
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Gestantes",
                        "Pessoas com marca-passo",
                        "Portadores de implantes metálicos recentes",
                        "Pessoas com bombas de insulina"
                      ].map((contraindication, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-destructive mt-0.5">⚠️</span>
                          <span>{contraindication}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-muted-foreground mt-4">
                      Sempre consulte seu médico antes de iniciar qualquer tratamento.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6">
                Experimente a Magnetoterapia
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Descubra como 240 ímãs de 800 Gauss podem transformar 
                sua saúde e qualidade de vida.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/produtos">
                    Ver Colchões Magnéticos
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
