import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ShieldCheck, Scale, CreditCard, AlertTriangle, Users, UserCheck, Gavel, MapPin } from "lucide-react";

export default function TermosAfiliados() {
  const navigate = useNavigate();
  const lastUpdated = "21/01/2026";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="pl-0 hover:bg-transparent -ml-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <h1 className="text-4xl font-bold tracking-tight">Termos de Uso do Programa de Afiliados</h1>
            <p className="text-muted-foreground">Última atualização: {lastUpdated}</p>
          </div>
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Contrato de Afiliação Seguro</span>
          </div>
        </div>

        {/* Content */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-xl">Regras e Diretrizes do Programa</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-10 prose prose-slate dark:prose-invert max-w-none">
            
            {/* 1. Introdução */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Scale className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0">1. Objeto e Aceite</h2>
              </div>
              <p>
                Este regulamento define as regras para participação no Programa de Afiliados da <strong>Slim Quality</strong>. 
                Ao se cadastrar, você concorda integralmente com estes termos. O programa visa a divulgação e intermediação de vendas de nossos produtos através de links de indicação personalizados com atendimentos e venda através de <strong>“Assistente Virtual com inteligência artificial”</strong>.
              </p>
            </section>

            {/* 2. Comissões Multinível */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0">2. Estrutura de Comissionamento (3 Níveis)</h2>
              </div>
              <p>
                A Slim Quality opera um modelo de comissões multinível, incentivando tanto a venda direta através do “Assistente Virtual” quanto a expansão da rede:
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="font-bold text-lg block mb-1">Nível 1 (Direto)</span>
                  <p className="text-sm text-muted-foreground m-0">Afiliado que realiza a venda direta ao cliente final.</p>
                </div>
                <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                  <span className="font-bold text-lg block mb-1">Nível 2 (Indicação)</span>
                  <p className="text-sm text-muted-foreground m-0">Afiliado que indicou o Afiliado do Nível 1.</p>
                </div>
                <div className="p-4 bg-muted rounded-lg border">
                  <span className="font-bold text-lg block mb-1">Nível 3 (Indicação)</span>
                  <p className="text-sm text-muted-foreground m-0">Afiliado que indicou o Afiliado do Nível 2.</p>
                </div>
              </div>
              <div className="text-sm space-y-2 mt-4 text-muted-foreground">
                <p>* Os percentuais de comissão variam conforme o produto e podem ser consultados no painel do afiliado.</p>
                <p>* O valor para venda está no site com o preço a prazo para o consumidor, podendo ser parcelado até 12X sem juros.</p>
                <p>
                  <strong>O valor da comissão será apurado do valor líquido do preço à vista</strong>, o valor que a empresa Slim Quality receber do <strong>Asaas</strong>, depois que descontar todos os juros do parcelamento, será o valor líquido para cálculo da comissão.
                </p>
              </div>
            </section>

            {/* 3. Pagamentos */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <CreditCard className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0">3. Pagamentos e Wallet ID</h2>
              </div>
              <p>
                O processamento financeiro é realizado via integração com o <strong>Asaas</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>É obrigatório o cadastro de uma <strong>“Wallet ID Asaas”</strong> válida nas configurações do perfil.</li>
                <li>A comissão é creditada automaticamente após a confirmação do pagamento do pedido pelo cliente.</li>
                <li>O prazo de liberação para saque segue as políticas vigentes do processador de pagamentos.</li>
              </ul>
            </section>

            {/* 4. Proibições */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0 italic">4. Práticas Proibidas (Suspensão Imediata e Ações Legais)</h2>
              </div>
              <p>
                Para manter a integridade do ecossistema, são estritamente proibidas as seguintes práticas:
              </p>
              <div className="bg-destructive/5 border-l-4 border-destructive p-4 rounded-r-lg space-y-4">
                <ul className="list-none p-0 m-0 space-y-3">
                  <li className="flex gap-2">
                    <span className="text-destructive font-bold">•</span>
                    <span><strong>SPAM:</strong> Disparo massivo de links por WhatsApp, E-mail ou redes sociais sem consentimento.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-destructive font-bold">•</span>
                    <span><strong>Auto-afiliação:</strong> Comprar através de seu próprio link para obter desconto/comissão.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-destructive font-bold">•</span>
                    <span><strong>Propaganda Enganosa/Abusiva:</strong> Prometer benefícios, resultados ou curas não condizentes com o produto original, em desacordo com o Código de Defesa do Consumidor e a legislação de publicidade vigente.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-destructive font-bold">•</span>
                    <span><strong>Cookie Stuffing:</strong> Uso de scripts para forçar a inserção de cookies de rastreamento no navegador do usuário.</span>
                  </li>
                </ul>
                <p className="text-sm font-semibold border-t border-destructive/20 pt-3">
                  A violação de qualquer prática proibida, além da suspensão imediata e perda de saldos pendentes (conforme Item 6), sujeitará o Afiliado às medidas legais cabíveis (cíveis e criminais) por parte da Slim Quality e/ou de terceiros prejudicados.
                </p>
              </div>
            </section>

            {/* 5. LGPD */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0">5. Privacidade e LGPD</h2>
              </div>
              <p>
                A Slim Quality trata os dados pessoais dos afiliados e clientes em conformidade com a <strong>“Lei Geral de Proteção de Dados” (Lei 13.709/2018)</strong>. 
                Ao participar do programa, você concorda que seus dados de contato sejam compartilhados com sua rede de ascendência (níveis superiores) para fins de mentoria e suporte.
              </p>
            </section>

            {/* 6. Rescisão */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Scale className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0">6. Alterações e Rescisão</h2>
              </div>
              <p>
                A Slim Quality reserva-se o direito de alterar as taxas de comissão ou encerrar o programa a qualquer momento, mediante aviso prévio de 15 dias. 
                A violação reiterada de qualquer cláusula deste termo resultará no cancelamento imediato da conta e perda de saldos pendentes.
              </p>
            </section>

            {/* 7. Autonomia */}
            <section className="space-y-4 border-t pt-8">
              <div className="flex items-center gap-2 text-primary">
                <UserCheck className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0">7. Autonomia e Inexistência de Vínculo Trabalhista</h2>
              </div>
              <div className="space-y-3">
                <p>
                  7.1. O presente Termo estabelece uma relação de parceria comercial e afiliação para intermediação de vendas, de natureza estritamente civil, não implicando em qualquer forma de vínculo empregatício, societário, de representação comercial, agenciamento ou mandato entre o Afiliado e a Slim Quality.
                </p>
                <p>
                  7.2. O Afiliado é integralmente responsável pela gestão de sua atividade, arcando com todos os custos operacionais, tributários e previdenciários (INSS, IR, ISS, etc.) decorrentes de sua atuação e dos valores recebidos a título de comissão.
                </p>
                <p>
                  7.3. O Afiliado atua com total autonomia, sem subordinação hierárquica, habitualidade de horário ou exigência de exclusividade, utilizando seus próprios recursos e métodos para a divulgação dos produtos.
                </p>
              </div>
            </section>

            {/* 8. Responsabilidade */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Gavel className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0">8. Responsabilidade do Afiliado</h2>
              </div>
              <div className="space-y-3">
                <p>
                  8.1. O Afiliado é o único e exclusivo responsável por quaisquer danos, prejuízos, litígios ou reclamações, judiciais ou extrajudiciais, causados a terceiros, consumidores ou autoridades públicas, decorrentes direta ou indiretamente de suas ações, omissões, propagandas, comunicações ou práticas comerciais durante a vigência do programa de afiliação.
                </p>
                <p>
                  8.2. O Afiliado compromete-se a indenizar regressivamente a Slim Quality por quaisquer valores que a empresa seja obrigada a pagar judicialmente em razão de condutas atribuíveis ao Afiliado, incluindo custas processuais e honorários advocatícios.
                </p>
              </div>
            </section>

            {/* 9. Foro */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0">9. Foro e Legislação Aplicável</h2>
              </div>
              <div className="space-y-3">
                <p>9.1. Estes Termos de Uso são regidos pela legislação brasileira.</p>
                <p>
                  9.2. Para dirimir quaisquer dúvidas ou litígios decorrentes do presente instrumento, as Partes elegem o <strong>Foro da Comarca de Ipatinga - MG</strong>, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
                </p>
              </div>
            </section>

          </CardContent>
        </Card>

        {/* Footer actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-8 border-t">
          <p className="text-sm text-muted-foreground">
            Dúvidas sobre os termos? Entre em contato com nosso suporte.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate("/afiliados/cadastro")}>
              Voltar ao Cadastro
            </Button>
            <Button onClick={() => window.print()} variant="secondary">
              Imprimir Termos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

