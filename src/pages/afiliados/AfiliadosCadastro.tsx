import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, UserCheck } from "lucide-react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { supabase } from "@/config/supabase";

export default function AfiliadosCadastro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { registerWithAffiliate, isAuthenticated } = useCustomerAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estado para indicação
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  
  // Form data - Campos essenciais + senha
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

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
      const savedRef = refParam || localStorage.getItem('referralCode');
      
      if (!savedRef) return;

      try {
        // 3. Buscar afiliado pelo código ou slug
        const { data } = await supabase
          .from('affiliates')
          .select('name, referral_code')
          .or(`referral_code.eq.${savedRef},slug.eq.${savedRef}`)
          .eq('status', 'active')
          .is('deleted_at', null)
          .single();

        if (data) {
          setReferrerName(data.name);
          setReferralCode(data.referral_code);
          
          // Salvar no localStorage se veio da URL
          if (refParam) {
            localStorage.setItem('referralCode', data.referral_code);
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
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Validar senha
    if (formData.password.length < 6) {
      toast({
        title: "Senha fraca",
        description: "A senha deve ter pelo menos 6 caracteres",
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
      // Usar customerAuthService.registerWithAffiliate
      const result = await registerWithAffiliate({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        referralCode: referralCode || undefined
      });
      
      if (result.success) {
        setShowSuccess(true);
      } else {
        toast({
          title: "Erro no cadastro",
          description: result.error || "Não foi possível criar sua conta",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao cadastrar afiliado:', error);
      toast({
        title: "Erro no cadastro",
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

                {/* CPF - Largura Total */}
                <div className="space-y-2">
                  <Label htmlFor="cpf">
                    CPF <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="cpf" 
                    placeholder="000.000.000-00" 
                    value={formData.cpf}
                    onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                    required 
                  />
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
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="Mínimo 6 caracteres" 
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required 
                  />
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirmar Senha <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="confirmPassword" 
                    type="password"
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
