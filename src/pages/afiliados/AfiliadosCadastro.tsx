import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Info, CheckCircle2, ExternalLink } from "lucide-react";

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function AfiliadosCadastro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWalletHelp, setShowWalletHelp] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasAsaasAccount, setHasAsaasAccount] = useState("sim");
  const [walletId, setWalletId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptedTerms) {
      toast({
        title: "Atenção",
        description: "Você precisa aceitar os termos para continuar",
        variant: "destructive"
      });
      return;
    }

    if (!walletId.startsWith("wal_")) {
      toast({
        title: "Wallet ID inválida",
        description: "A Wallet ID deve começar com 'wal_'",
        variant: "destructive"
      });
      return;
    }

    setShowSuccess(true);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate("/afiliados/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2 pb-8">
            <div className="mx-auto h-12 w-12 rounded-lg bg-primary mb-4" />
            <CardTitle className="text-3xl font-bold">Cadastro de Afiliado</CardTitle>
            <p className="text-muted-foreground">Preencha os dados e comece a ganhar hoje</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Seção 1: Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Informações Pessoais</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="nome">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input id="nome" placeholder="Ex: Carlos Mendes" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">
                      CPF <span className="text-destructive">*</span>
                    </Label>
                    <Input id="cpf" placeholder="000.000.000-00" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nascimento">
                      Data de Nascimento <span className="text-destructive">*</span>
                    </Label>
                    <Input id="nascimento" type="date" required />
                  </div>
                </div>
              </div>

              {/* Seção 2: Contato */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Informações de Contato</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input id="email" type="email" placeholder="seu@email.com" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">
                    Telefone/WhatsApp <span className="text-destructive">*</span>
                  </Label>
                  <Input id="telefone" placeholder="(00) 00000-0000" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" placeholder="Belo Horizonte" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select>
                      <SelectTrigger id="estado">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map(estado => (
                          <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seção 3: Conta Asaas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Configuração de Recebimento</h3>
                
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                  <div className="flex gap-2">
                    <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-semibold">Como funciona o recebimento?</p>
                      <p className="text-sm text-muted-foreground">
                        Você receberá suas comissões automaticamente via Asaas.
                        É necessário ter uma conta Asaas para receber os pagamentos.
                      </p>
                      <p className="text-sm">
                        Ainda não tem conta?{" "}
                        <a 
                          href="https://asaas.com/cadastro" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Crie gratuitamente em: asaas.com/cadastro
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="walletId">
                    Wallet ID do Asaas <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="walletId" 
                    placeholder="Ex: wal_000005162549" 
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowWalletHelp(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Como encontrar minha Wallet ID?
                  </button>
                </div>

                <div className="space-y-3">
                  <Label>Já tem conta no Asaas?</Label>
                  <RadioGroup value={hasAsaasAccount} onValueChange={setHasAsaasAccount}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="sim" />
                      <Label htmlFor="sim" className="font-normal cursor-pointer">
                        Sim, já tenho conta
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="nao" />
                      <Label htmlFor="nao" className="font-normal cursor-pointer">
                        Não, preciso criar
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  {hasAsaasAccount === "nao" && (
                    <a 
                      href="https://asaas.com/cadastro" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      Criar conta no Asaas agora
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Seção 4: Indicação (Opcional) */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Código de Indicação</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código de Indicação (opcional)</Label>
                  <Input id="codigo" placeholder="Ex: CARLOS2024" />
                  <p className="text-sm text-muted-foreground">
                    Foi indicado por alguém? Cole o código aqui para que ele ganhe comissão
                  </p>
                </div>
              </div>

              {/* Seção 5: Termos */}
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="font-normal cursor-pointer leading-tight">
                    Li e aceito os{" "}
                    <a 
                      href="/termos-afiliados" 
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      termos do programa de afiliados
                    </a>
                  </Label>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-between pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate("/afiliados")}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="lg" className="px-8">
                  Criar Minha Conta
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Ajuda - Wallet ID */}
      <Dialog open={showWalletHelp} onOpenChange={setShowWalletHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como Encontrar Sua Wallet ID</DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="space-y-4">
              <ol className="space-y-3 list-decimal list-inside">
                <li>Acesse sua conta no Asaas (asaas.com)</li>
                <li>Vá em "Configurações" → "Integrações" → "API"</li>
                <li>Sua Wallet ID estará visível no formato: wal_XXXXXXXXXXXX</li>
                <li>Copie e cole aqui</li>
              </ol>
              <a 
                href="https://www.youtube.com/watch?v=example" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                📹 Ver vídeo tutorial
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button onClick={() => setShowWalletHelp(false)} className="w-full">
                Entendi
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      {/* Modal de Sucesso */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            </div>
            <DialogTitle className="text-2xl">Bem-vindo ao Programa de Afiliados!</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 text-center">
                <p>Sua conta foi criada com sucesso. Suas comissões serão depositadas automaticamente na sua conta Asaas.</p>
                
                <div className="bg-success/10 border border-success/20 rounded-lg p-4 space-y-2 text-left">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Sua Wallet ID está configurada</span>
                  </div>
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Você receberá comissões automaticamente</span>
                  </div>
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Sem necessidade de solicitar saques</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button onClick={handleSuccessClose} size="lg" className="w-full">
                    Acessar Meu Dashboard
                  </Button>
                  <Button variant="outline" className="w-full">
                    Falar com Suporte
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
