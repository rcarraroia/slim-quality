import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, UserCheck, AlertCircle } from "lucide-react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { supabase } from "@/config/supabase";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { PasswordInput } from "@/components/ui/password-input";
import { validateCPF, validateCNPJ, formatCPF, formatCNPJ, parseDocument } from "@/utils/validators";
import PaywallCadastro from "@/components/PaywallCadastro";

export default function AfiliadosCadastro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useCustomerAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado para indicação
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Estado para paywall
  const [showPaywall, setShowPaywall] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Form data - Campos essenciais + senha + tipo de afiliado
  const [formData, setFormData] = useState({
    name: "",
    affiliateType: "individual" as "individual" | "logista",
    document: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  // Estado para erros de validação
  const [documentError, setDocumentError] = useState<string | null>(null);

  // Redirecionar se já autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/afiliados/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Buscar nome do afiliado indicador ao carregar
  useEffect(() => {
    const loadReferrer = async () => {
      // 1. Verificar parâmetro ref na URL
      const refParam = searchParams.get('ref');

      // 2. Se não tem na URL, verificar localStorage
      const savedRef = refParam || localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);

      if (!savedRef) return;

      try {
        // 3. Buscar afiliado pelo código ou slug
        const savedRefUpper = savedRef.toUpperCase();
        const { data } = await supabase
          .from('affiliates')
          .select('name, referral_code')
          .or(`referral_code.eq.${savedRef},referral_code.eq.${savedRefUpper},slug.eq.${savedRef},slug.eq.${savedRefUpper}`)
          .eq('status', 'active')
          .is('deleted_at', null)
          .maybeSingle();

        if (data) {
          setReferrerName(data.name);
          setReferralCode(data.referral_code);

          // Salvar no localStorage se veio da URL
          if (refParam) {
            localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, data.referral_code);
          }
        }
      } catch (error) {
        console.warn('Erro ao buscar afiliado indicador:', error);
      }
    };

    loadReferrer();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      toast({
        title: "Atenção",
        description: "Você precisa aceitar os termos para continuar",
        variant: "destructive"
      });
      return;
    }

    // Validar campos obrigatórios
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.document) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Validar documento baseado no tipo
    const cleanDoc = parseDocument(formData.document);
    if (formData.affiliateType === 'individual') {
      if (cleanDoc.length !== 11) {
        toast({
          title: "CPF inválido",
          description: "O CPF deve ter 11 dígitos",
          variant: "destructive"
        });
        return;
      }
      if (!validateCPF(cleanDoc)) {
        toast({
          title: "CPF inválido",
          description: "Verifique os dígitos do CPF informado",
          variant: "destructive"
        });
        return;
      }
    } else {
      if (cleanDoc.length !== 14) {
        toast({
          title: "CNPJ inválido",
          description: "O CNPJ deve ter 14 dígitos",
          variant: "destructive"
        });
        return;
      }
      if (!validateCNPJ(cleanDoc)) {
        toast({
          title: "CNPJ inválido",
          description: "Verifique os dígitos do CNPJ informado",
          variant: "destructive"
        });
        return;
      }
    }

    // Validar senha
    if (formData.password.length < 8) {
      toast({
        title: "Senha fraca",
        description: "A senha deve ter pelo menos 8 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A confirmação de senha deve ser igual à senha",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Chamar API de validação prévia (Payment First)
      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          affiliate_type: formData.affiliateType,
          document: parseDocument(formData.document),
          referred_by: referralCode || undefined
        })
      });

      const result = await response.json();

      if (result.success) {
        // Armazenar token de sessão
        setSessionToken(result.session_token);
        
        // Exibir paywall
        setShowPaywall(true);
      } else {
        toast({
          title: "Erro na validação",
          description: result.error || "Não foi possível validar seus dados",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao validar dados:', error);
      toast({
        title: "Erro na validação",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate("/afiliados/dashboard");
  };

  const handlePaymentConfirmed = () => {
    // Pagamento confirmado - redirecionar para dashboard
    toast({
      title: "Pagamento confirmado!",
      description: "Sua conta foi ativada com sucesso. Bem-vindo!",
    });
    navigate("/afiliados/dashboard");
  };

  const handlePaywallBack = () => {
    // Usuário voltou do paywall - limpar estado
    setShowPaywall(false);
    setSessionToken(null);
    toast({
      title: "Cadastro cancelado",
      description: "Você pode tentar novamente quando quiser.",
      variant: "default"
    });
  };

  // Se paywall está ativo, renderizar apenas o paywall
  if (showPaywall && sessionToken) {
    return (
      <PaywallCadastro
        sessionToken={sessionToken}
        affiliateType={formData.affiliateType}
        email={formData.email}
        password={formData.password}
        onPaymentConfirmed={handlePaymentConfirmed}
        onBack={handlePaywallBack}
      />
    );
  }

  // Caso contrário, renderizar formulário de cadastro
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card de Indicação (se houver) */}
              {referrerName && (
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Você foi indicado por</p>
                      <p className="font-semibold text-lg">{referrerName}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Seção Única: Dados Essenciais */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Dados para Cadastro</h3>

                {/* Nome Completo - Largura Total */}
                <div className="space-y-2">
                  <Label htmlFor="nome">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Carlos Mendes"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                {/* Tipo de Afiliado */}
                <div className="space-y-2">
                  <Label htmlFor="affiliateType">
                    Tipo de Afiliado <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.affiliateType}
                    onValueChange={(value: "individual" | "logista") => {
                      setFormData(prev => ({ ...prev, affiliateType: value, document: "" }));
                      setDocumentError(null);
                    }}
                  >
                    <SelectTrigger id="affiliateType">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual (Pessoa Física)</SelectItem>
                      <SelectItem value="logista">Logista (Loja Física)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.affiliateType === 'individual' 
                      ? 'Para pessoas físicas que desejam indicar produtos'
                      : 'Para lojas físicas que desejam revender produtos'}
                  </p>
                </div>

                {/* Documento (CPF ou CNPJ) - Condicional */}
                <div className="space-y-2">
                  <Label htmlFor="document">
                    {formData.affiliateType === 'individual' ? 'CPF' : 'CNPJ'} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="document"
                    placeholder={formData.affiliateType === 'individual' ? '000.000.000-00' : '00.000.000/0000-00'}
                    value={formData.document}
                    onChange={(e) => {
                      const value = e.target.value;
                      const cleanValue = parseDocument(value);
                      
                      // Aplicar formatação
                      let formatted = value;
                      if (formData.affiliateType === 'individual' && cleanValue.length <= 11) {
                        formatted = formatCPF(cleanValue);
                      } else if (formData.affiliateType === 'logista' && cleanValue.length <= 14) {
                        formatted = formatCNPJ(cleanValue);
                      }
                      
                      setFormData(prev => ({ ...prev, document: formatted }));
                      
                      // Validar em tempo real
                      if (cleanValue.length > 0) {
                        if (formData.affiliateType === 'individual') {
                          if (cleanValue.length === 11) {
                            if (!validateCPF(cleanValue)) {
                              setDocumentError('CPF inválido. Verifique os dígitos.');
                            } else {
                              setDocumentError(null);
                            }
                          } else if (cleanValue.length > 11) {
                            setDocumentError('CPF deve ter 11 dígitos.');
                          } else {
                            setDocumentError(null);
                          }
                        } else {
                          if (cleanValue.length === 14) {
                            if (!validateCNPJ(cleanValue)) {
                              setDocumentError('CNPJ inválido. Verifique os dígitos.');
                            } else {
                              setDocumentError(null);
                            }
                          } else if (cleanValue.length > 14) {
                            setDocumentError('CNPJ deve ter 14 dígitos.');
                          } else {
                            setDocumentError(null);
                          }
                        }
                      } else {
                        setDocumentError(null);
                      }
                    }}
                    className={documentError ? 'border-destructive' : ''}
                    required
                  />
                  {documentError && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{documentError}</span>
                    </div>
                  )}
                </div>

                {/* Email - Largura Total */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                {/* Telefone - Largura Total */}
                <div className="space-y-2">
                  <Label htmlFor="telefone">
                    Telefone/WhatsApp <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="telefone"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>

                {/* Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Senha <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="password"
                    placeholder="Mínimo 8 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres
                  </p>
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirmar Senha <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Repita a senha"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Informação sobre dados adicionais */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 Você poderá completar seu perfil (endereço, data de nascimento) após o cadastro, no painel de configurações.
                </p>
              </div>

              {/* Seção 3: Termos */}
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
                <Button type="submit" size="lg" className="px-8" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validando Dados...
                    </>
                  ) : (
                    "Continuar para Pagamento"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

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
                <p>Sua conta foi criada com sucesso. Configure sua Wallet ID nas configurações para começar a receber comissões.</p>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2 text-left">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Conta de afiliado criada</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                    <span className="text-sm">Configure sua Wallet ID para receber comissões</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                    <span className="text-sm">Comece a indicar e ganhar</span>
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
