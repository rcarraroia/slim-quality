import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ShieldCheck, Scale, CreditCard, AlertTriangle, Users } from "lucide-react";

export default function TermosAfiliados() {
  const navigate = useNavigate();
  const lastUpdated = "05/01/2026";

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
                Ao se cadastrar, você concorda integralmente com estes termos. O programa visa a divulgação e intermediação de vendas de nossos produtos através de links de indicação personalizados.
              </p>
            </section>

            {/* 2. Comissões Multinível */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0">2. Estrutura de Comissionamento (3 Níveis)</h2>
              </div>
              <p>
                A Slim Quality opera um modelo de comissões multinível, incentivando tanto a venda direta quanto a expansão da rede:
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="font-bold text-lg block mb-1">Nível 1 (Direto)</span>
                  <p className="text-sm text-muted-foreground m-0">Afiliado que realiza a venda direta ao cliente final.</p>
                </div>
                <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                  <span className="font-bold text-lg block mb-1">Nível 2</span>
                  <p className="text-sm text-muted-foreground m-0">Afiliado que indicou o Afiliado do Nível 1.</p>
                </div>
                <div className="p-4 bg-muted rounded-lg border">
                  <span className="font-bold text-lg block mb-1">Nível 3</span>
                  <p className="text-sm text-muted-foreground m-0">Afiliado que indicou o Afiliado do Nível 2.</p>
                </div>
              </div>
              <p className="text-sm italic mt-2">
                * Os percentuais de comissão variam conforme o produto e podem ser consultados no painel do afiliado.
              </p>
            </section>

            {/* 3. Pagamentos */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <CreditCard className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0">3. Pagamentos e Wallet ID</h2>
              </div>
              <p>
                O processamento financeiro é realizado via integração com o **Asaas**.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>É obrigatório o cadastro de uma <strong>Wallet ID Asaas</strong> válida nas configurações do perfil.</li>
                <li>As comissões são creditadas automaticamente após a confirmação do pagamento do pedido pelo cliente.</li>
                <li>O prazo de liberação para saque segue as políticas vigentes do processador de pagamentos.</li>
              </ul>
            </section>

            {/* 4. Proibições */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0 italic">4. Práticas Proibidas (Suspensão Imediata)</h2>
              </div>
              <p>
                Para manter a integridade do ecossistema, são estritamente proibidas as seguintes práticas:
              </p>
              <div className="bg-destructive/5 border-l-4 border-destructive p-4 rounded-r-lg">
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
                    <span><strong>Propaganda Enganosa:</strong> Prometer benefícios ou resultados não condizentes com o produto original.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-destructive font-bold">•</span>
                    <span><strong>Cookie Stuffing:</strong> Uso de scripts para forçar a inserção de cookies de rastreamento no navegador do usuário.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 5. LGPD */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <h2 className="text-xl font-bold m-0">5. Privacidade e LGPD</h2>
              </div>
              <p>
                A Slim Quality trata os dados pessoais dos afiliados e clientes em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018). 
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
