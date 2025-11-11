import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { WalletIdValidator } from "@/components/affiliates/WalletIdValidator";
import { affiliateService } from "@/services/affiliate-frontend.service";
import { useCurrentReferralCode } from "@/hooks/useReferralTracking";
import { Info, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function AfiliadosCadastro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentReferralCode = useCurrentReferralCode();
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWalletHelp, setShowWalletHelp] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasAsaasAccount, setHasAsaasAccount] = useState("sim");
  const [walletId, setWalletId] = useState("");
  const [isWalletValid, setIsWalletValid] = useState(false);
  const [walletName, setWalletName] = useState("");
  
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf_cnpj: "",
    birth_date: "",
    city: "",
    state: "",
    referral_code: currentReferralCode || "",
  });

  // Mutation para cadastro
  const registerMutation = useMutation({
    mutationFn: affiliateService.register,
    onSuccess: () => {
      setShowSuccess(true);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no cadastro",
        description: error.response?.data?.message || "Erro interno. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWalletValidation = (isValid: boolean, name?: string) => {
    setIsWalletValid(isValid);
    setWalletName(name || "");
  };

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

    if (!isWalletValid) {
      toast({
        title: "Wallet ID inválida",
        description: "Verifique se a Wallet ID está correta e ativa no Asaas",
        variant: "destructive"
      });
      return;
    }

    // Validações básicas
    if (!formData.name || !formData.email || !formData.phone || !formData.cpf_cnpj) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Submeter cadastro
    registerMutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      cpf_cnpj: formData.cpf_cnpj,
      wallet_id: walletId,
      referral_code: formData.referral_code || undefined,
    });
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
                  <Input 
                    id="nome" 
                    placeholder="Ex: Carlos Mendes" 
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">
                      CPF/CNPJ <span className="text-destructive">*</span>
                    </Label>
                    <Input 
                      id="cpf" 
                      placeholder="000.000.000-00" 
                      value={formData.cpf_cnpj}
                      onChange={(e) => handleInputChange("cpf_cnpj", e.target.value)}
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nascimento">
                      Data de Nascimento
                    </Label>
                    <Input 
                      id="nascimento" 
                      type="date" 
                      value={formData.birth_date}
                      onChange={(e) => handleInputChange("birth_date", e.target.value)}
                    />
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
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">
                    Telefone/WhatsApp <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="telefone" 
                    placeholder="(00) 00000-0000" 
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input 
                      id="cidade" 
                      placeholder="Belo Horizonte" 
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={formData.state} onValueChange={(value) => handleInputChange("state", value)}>
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

                <WalletIdValidator
                  value={walletId}
                  onChange={setWalletId}
                  onValidationChange={handleWalletValidation}
                  label="Wallet ID do Asaas"
                  placeholder="Ex: wal_000005162549"
                  required
                />
                
                <button
                  type="button"
                  onClick={() => setShowWalletHelp(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Como encontrar minha Wallet ID?
                </button>

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
                  <Input 
                    id="codigo" 
                    placeholder="Ex: CARLOS2024" 
                    value={formData.referral_code}
                    onChange={(e) => handleInputChange("referral_code", e.target.value)}
                  />
                  {currentReferralCode && (
                    <p className="text-sm text-green-600">
                      ✓ Código detectado automaticamente: <strong>{currentReferralCode}</strong>
                    </p>
                  )}
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
                <Button 
                  type="submit" 
                  size="lg" 
                  className="px-8"
                  disabled={registerMutation.isPending || !isWalletValid}
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando Conta...
                    </>
                  ) : (
                    "Criar Minha Conta"
                  )}
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
