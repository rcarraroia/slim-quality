import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Shield, Bell, User, CheckCircle2, AlertCircle, Info, ExternalLink, Loader2, Link as LinkIcon } from "lucide-react";
import { affiliateFrontendService } from "@/services/frontend/affiliate.service";
import { supabase } from "@/config/supabase";

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function AffiliateDashboardConfiguracoes() {
  const { toast } = useToast();

  // Estados para dados do afiliado
  const [affiliate, setAffiliate] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estado controlado para o campo Estado
  const [selectedState, setSelectedState] = useState("");

  // Estados para Wallet ID
  const [walletId, setWalletId] = useState("");
  const [showWalletHelp, setShowWalletHelp] = useState(false);
  const [showAsaasModal, setShowAsaasModal] = useState(false);
  const [asaasFlow, setAsaasFlow] = useState<'question' | 'has-asaas' | 'no-asaas'>('question');
  const [testingWallet, setTestingWallet] = useState(false);
  const [validatingWallet, setValidatingWallet] = useState(false);
  const [walletStatus, setWalletStatus] = useState<{
    configured: boolean;
    valid?: boolean;
    lastTested?: string;
    error?: string;
  }>({ configured: false });

  // Estados para Slug
  const [slug, setSlug] = useState("");
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{ available: boolean; message: string } | null>(null);

  // Estados para notificações
  const [notificationPreferences, setNotificationPreferences] = useState({
    email_commissions: true,
    email_monthly_report: true,
    email_new_affiliates: true,
    email_promotions: false
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Estados para alteração de senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Carregar dados do afiliado ao montar componente
  useEffect(() => {
    loadAffiliateData();
  }, []);

  const loadAffiliateData = async () => {
    try {
      setLoading(true);

      // Buscar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar dados do afiliado
      const { isAffiliate, affiliate: affiliateData } = await affiliateFrontendService.checkAffiliateStatus();

      if (isAffiliate && affiliateData) {
        setAffiliate(affiliateData);

        // Configurar slug
        if (affiliateData.slug) {
          setSlug(affiliateData.slug);
        }

        // Configurar status da Wallet ID
        if (affiliateData.walletId) {
          setWalletId(affiliateData.walletId);
          setWalletStatus({
            configured: true,
            valid: true,
            lastTested: new Date().toISOString()
          });
        } else {
          setWalletStatus({ configured: false });
        }
      }

      // Buscar dados do customer (cidade, estado, CEP, data nascimento)
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, user_id, name, email, phone, cpf_cnpj, birth_date, street, number, complement, neighborhood, city, state, postal_code, source, referral_code, assigned_to, status, notes, created_at, updated_at, deleted_at')
        .eq('user_id', user.id)
        .single();

      if (customerData) {
        setCustomer(customerData);
        // Inicializar estado controlado do campo Estado
        setSelectedState(customerData.state || "");
      }

      // Buscar preferências de notificações
      try {
        const preferences = await affiliateFrontendService.getNotificationPreferences();
        setNotificationPreferences({
          email_commissions: preferences.email_commissions,
          email_monthly_report: preferences.email_monthly_report,
          email_new_affiliates: preferences.email_new_affiliates,
          email_promotions: preferences.email_promotions
        });
      } catch (error) {
        console.error('Erro ao carregar preferências:', error);
      }

    } catch (error) {
      console.error('Erro ao carregar dados do afiliado:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar suas informações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePersonal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Coletar dados do formulário
      const nameInput = document.getElementById('nome') as HTMLInputElement;
      const emailInput = document.getElementById('email') as HTMLInputElement;
      const phoneInput = document.getElementById('telefone') as HTMLInputElement;
      const cityInput = document.getElementById('cidade') as HTMLInputElement;
      const cepInput = document.getElementById('cep') as HTMLInputElement;
      const birthDateInput = document.getElementById('birthDate') as HTMLInputElement;

      const formData = {
        name: nameInput?.value || '',
        email: emailInput?.value || '',
        phone: phoneInput?.value || '',
        city: cityInput?.value || null,
        state: selectedState || null, // ✅ Usar estado controlado
        cep: cepInput?.value || null,
        birth_date: birthDateInput?.value || null,
      };

      // Validar campos obrigatórios
      if (!formData.name || !formData.email) {
        toast({
          title: "Campos obrigatórios",
          description: "Nome e email são obrigatórios",
          variant: "destructive"
        });
        return;
      }

      // 1. Atualizar dados na tabela affiliates (incluindo city, state, cep, birth_date)
      // NOTA: Email não é atualizado aqui para manter consistência com auth.users
      const { error: affiliateError } = await supabase
        .from('affiliates')
        .update({
          name: formData.name,
          // email: formData.email,  // ← Removido para prevenir inconsistência com auth.users
          phone: formData.phone,
          city: formData.city,
          state: formData.state,
          cep: formData.cep,
          birth_date: formData.birth_date,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (affiliateError) throw affiliateError;

      // 2. Atualizar dados na tabela profiles (sincronizar)
      // NOTA: Email não é atualizado para manter consistência com auth.users
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.name,
          // email não é atualizado aqui
          phone: formData.phone,
          is_affiliate: true,
          affiliate_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) {
        console.warn('Erro ao atualizar profile:', profileError);
      }

      // 3. Atualizar dados de endereço na tabela customers
      // NOTA: Email não é atualizado para manter consistência com auth.users
      if (customer?.id) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            // email: formData.email,  // ← Removido para prevenir inconsistência
            phone: formData.phone,
            city: formData.city,
            state: formData.state,
            postal_code: formData.cep,
            birth_date: formData.birth_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', customer.id);

        if (customerError) {
          console.warn('Erro ao atualizar customer:', customerError);
        }
      }

      toast({ title: "✅ Dados salvos com sucesso!" });

      // Recarregar dados
      await loadAffiliateData();
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const handleTestWallet = async () => {
    if (!walletId.trim()) {
      toast({
        title: "Wallet ID obrigatória",
        description: "Digite uma Wallet ID para testar",
        variant: "destructive"
      });
      return;
    }

    setTestingWallet(true);
    try {
      const validation = await affiliateFrontendService.validateWallet(walletId);

      if (validation.isValid && validation.isActive) {
        setWalletStatus({
          configured: walletStatus.configured,
          valid: true,
          lastTested: new Date().toISOString()
        });

        toast({
          title: "✅ Wallet ID válida!",
          description: `Conexão com Asaas confirmada${validation.name ? ` - ${validation.name}` : ''}`
        });
      } else {
        setWalletStatus({
          configured: walletStatus.configured,
          valid: false,
          lastTested: new Date().toISOString(),
          error: validation.error || 'Wallet ID inválida'
        });

        toast({
          title: "❌ Wallet ID inválida",
          description: validation.error || "Não foi possível validar a Wallet ID",
          variant: "destructive"
        });
      }
    } catch (error) {
      setWalletStatus({
        configured: walletStatus.configured,
        valid: false,
        lastTested: new Date().toISOString(),
        error: 'Erro na validação'
      });

      toast({
        title: "Erro na validação",
        description: "Não foi possível testar a Wallet ID. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setTestingWallet(false);
    }
  };

  const handleUpdateWallet = async () => {
    if (!walletId.trim()) {
      toast({
        title: "Wallet ID obrigatória",
        description: "Digite uma Wallet ID para salvar",
        variant: "destructive"
      });
      return;
    }

    // Validar formato básico
    if (!walletId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      toast({
        title: "Formato inválido",
        description: "A Wallet ID deve ser um UUID válido",
        variant: "destructive"
      });
      return;
    }

    setValidatingWallet(true);
    try {
      // 1. Validar Wallet ID
      const validation = await affiliateFrontendService.validateWallet(walletId);

      if (!validation.isValid || !validation.isActive) {
        setWalletStatus({
          configured: walletStatus.configured,
          valid: false,
          lastTested: new Date().toISOString(),
          error: validation.error || 'Wallet ID inválida'
        });

        toast({
          title: "Wallet ID inválida",
          description: validation.error || "A Wallet ID não é válida ou não está ativa",
          variant: "destructive"
        });
        return;
      }

      // 2. Salvar Wallet ID no banco de dados
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error: updateError } = await supabase
        .from('affiliates')
        .update({
          wallet_id: walletId,
          status: 'active', // Ativar afiliado após configurar wallet
          wallet_configured_at: new Date().toISOString(),
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (updateError) {
        throw new Error(`Erro ao salvar Wallet ID: ${updateError.message}`);
      }

      // 3. Atualizar estado local
      setWalletStatus({
        configured: true,
        valid: true,
        lastTested: new Date().toISOString()
      });

      // 4. Atualizar dados do afiliado
      if (affiliate) {
        setAffiliate({
          ...affiliate,
          walletId: walletId,
          status: 'active'
        });
      }

      toast({
        title: "✅ Wallet ID configurada!",
        description: `Suas comissões serão depositadas automaticamente${validation.name ? ` para ${validation.name}` : ''}`
      });

    } catch (error) {
      console.error('Erro ao configurar Wallet ID:', error);

      setWalletStatus({
        configured: walletStatus.configured,
        valid: false,
        lastTested: new Date().toISOString(),
        error: 'Erro ao salvar'
      });

      toast({
        title: "Erro ao configurar",
        description: error instanceof Error ? error.message : "Não foi possível salvar a Wallet ID. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setValidatingWallet(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSavingNotifications(true);

      await affiliateFrontendService.saveNotificationPreferences(notificationPreferences);

      toast({
        title: "Preferências salvas!",
        description: "Suas preferências de notificações foram atualizadas com sucesso."
      });
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas preferências. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      // Validações
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todos os campos",
          variant: "destructive"
        });
        return;
      }

      if (newPassword.length < 8) {
        toast({
          title: "Senha fraca",
          description: "A nova senha deve ter no mínimo 8 caracteres",
          variant: "destructive"
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: "Senhas não conferem",
          description: "A nova senha e a confirmação devem ser iguais",
          variant: "destructive"
        });
        return;
      }

      if (currentPassword === newPassword) {
        toast({
          title: "Senha inválida",
          description: "A nova senha deve ser diferente da senha atual",
          variant: "destructive"
        });
        return;
      }

      setChangingPassword(true);

      // Tentar alterar senha usando Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      // Sucesso
      toast({
        title: "✅ Senha alterada!",
        description: "Sua senha foi alterada com sucesso."
      });

      // Limpar campos e fechar modal
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordModal(false);

    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);

      let errorMessage = "Não foi possível alterar a senha. Tente novamente.";

      if (error.message?.includes('same')) {
        errorMessage = "A nova senha deve ser diferente da senha atual";
      } else if (error.message?.includes('weak')) {
        errorMessage = "A senha é muito fraca. Use uma senha mais forte.";
      }

      toast({
        title: "Erro ao alterar senha",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // Funções para Slug
  const handleCheckSlug = async () => {
    if (!slug.trim()) {
      setSlugStatus({
        available: false,
        message: 'Digite um slug para verificar'
      });
      return;
    }

    setCheckingSlug(true);
    setSlugStatus(null);

    try {
      const result = await affiliateFrontendService.checkSlugAvailability(slug.trim().toLowerCase());
      setSlugStatus(result);
    } catch (error) {
      setSlugStatus({
        available: false,
        message: 'Erro ao verificar slug'
      });
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSaveSlug = async () => {
    try {
      // Se slug vazio, vai usar referral_code
      const slugToSave = slug.trim() || null;

      // Se tem slug, validar antes de salvar
      if (slugToSave) {
        const validation = await affiliateFrontendService.checkSlugAvailability(slugToSave);
        if (!validation.available) {
          toast({
            title: "Slug indisponível",
            description: validation.message,
            variant: "destructive"
          });
          return;
        }
      }

      // Salvar slug
      await affiliateFrontendService.updateSlug(slugToSave);

      // Atualizar dados locais
      if (affiliate) {
        setAffiliate({
          ...affiliate,
          slug: slugToSave
        });
      }

      toast({
        title: "Slug atualizado!",
        description: slugToSave
          ? `Seu link agora é: slimquality.com.br/${slugToSave}`
          : `Seu link agora usa seu código: slimquality.com.br/${affiliate?.referralCode}`
      });

      // Recarregar dados
      loadAffiliateData();

    } catch (error) {
      console.error('Erro ao salvar slug:', error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Não foi possível salvar o slug",
        variant: "destructive"
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando configurações...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seção 1: Dados Pessoais */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Dados Pessoais</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" defaultValue={affiliate?.name || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={affiliate?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado. Para alterar, entre em contato com o suporte.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" defaultValue={affiliate?.phone || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" defaultValue="***.***.***-**" disabled />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                placeholder="Sua cidade"
                defaultValue={customer?.city || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={selectedState} onValueChange={setSelectedState}>
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
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                placeholder="00000-000"
                defaultValue={customer?.postal_code || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input
              id="birthDate"
              type="date"
              defaultValue={customer?.birth_date || ""}
            />
            <p className="text-xs text-muted-foreground">
              Opcional - Pode ser útil para validações futuras
            </p>
          </div>

          <Button onClick={handleSavePersonal}>Salvar Alterações</Button>
        </CardContent>
      </Card>

      {/* Seção 2: Configuração de Pagamento */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle>Configuração de Pagamento</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status da Wallet ID */}
          {walletStatus.configured ? (
            // Wallet ID Configurada
            <div className={`border rounded-lg p-4 space-y-2 ${walletStatus.valid
                ? 'bg-success/10 border-success/20'
                : 'bg-destructive/10 border-destructive/20'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {walletStatus.valid ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    <span className="font-semibold">
                      {walletStatus.valid ? 'Wallet ID Ativa' : 'Wallet ID com Problema'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Wallet ID atual: <span className="font-mono">{affiliate?.walletId}</span>
                  </p>
                  {walletStatus.lastTested && (
                    <p className={`text-xs mt-1 ${walletStatus.valid ? 'text-success' : 'text-destructive'
                      }`}>
                      Último teste: {new Date(walletStatus.lastTested).toLocaleString('pt-BR')} - {
                        walletStatus.valid ? '✅ Sucesso' : `❌ ${walletStatus.error}`
                      }
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestWallet}
                  disabled={testingWallet}
                >
                  {testingWallet ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Testando...
                    </>
                  ) : (
                    "Testar Conexão"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Wallet ID Não Configurada
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span className="font-semibold text-orange-900 dark:text-orange-200">
                  Configuração de Pagamento Pendente
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Para receber suas comissões, você precisa configurar sua Wallet ID do Asaas.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setAsaasFlow('question');
                    setShowAsaasModal(true);
                  }}
                  className="flex-1"
                >
                  Configurar Agora
                </Button>
                <Button
                  onClick={() => setShowWalletHelp(true)}
                  variant="outline"
                  size="sm"
                >
                  Como Configurar?
                </Button>
              </div>
            </div>
          )}

          {/* Configurar/Alterar Wallet ID */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="walletId">
                {walletStatus.configured ? 'Nova Wallet ID' : 'Wallet ID do Asaas'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="walletId"
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                />
                <Button
                  onClick={handleUpdateWallet}
                  disabled={validatingWallet}
                >
                  {validatingWallet ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Validando...
                    </>
                  ) : (
                    walletStatus.configured ? 'Atualizar' : 'Configurar'
                  )}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setShowWalletHelp(true)}
                className="text-sm text-primary hover:underline"
              >
                Como encontrar minha Wallet ID?
              </button>
            </div>

            {walletStatus.configured && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-orange-900 dark:text-orange-200">Atenção:</p>
                  <p className="text-muted-foreground mt-1">
                    Ao alterar a Wallet ID, as próximas comissões serão depositadas na nova conta.
                    Certifique-se de que a Wallet ID está correta.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seção 3: Notificações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notificações</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-comissao" className="cursor-pointer">Novas comissões</Label>
              <p className="text-sm text-muted-foreground">Receber email quando houver nova comissão</p>
            </div>
            <Checkbox
              id="notif-comissao"
              checked={notificationPreferences.email_commissions}
              onCheckedChange={(checked) =>
                setNotificationPreferences(prev => ({ ...prev, email_commissions: checked as boolean }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-mensal" className="cursor-pointer">Resumo mensal</Label>
              <p className="text-sm text-muted-foreground">Receber email no resumo mensal</p>
            </div>
            <Checkbox
              id="notif-mensal"
              checked={notificationPreferences.email_monthly_report}
              onCheckedChange={(checked) =>
                setNotificationPreferences(prev => ({ ...prev, email_monthly_report: checked as boolean }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-afiliados" className="cursor-pointer">Novos afiliados</Label>
              <p className="text-sm text-muted-foreground">Notificar sobre novos afiliados na rede</p>
            </div>
            <Checkbox
              id="notif-afiliados"
              checked={notificationPreferences.email_new_affiliates}
              onCheckedChange={(checked) =>
                setNotificationPreferences(prev => ({ ...prev, email_new_affiliates: checked as boolean }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-promocoes" className="cursor-pointer">Promoções</Label>
              <p className="text-sm text-muted-foreground">Receber emails sobre promoções e novidades</p>
            </div>
            <Checkbox
              id="notif-promocoes"
              checked={notificationPreferences.email_promotions}
              onCheckedChange={(checked) =>
                setNotificationPreferences(prev => ({ ...prev, email_promotions: checked as boolean }))
              }
            />
          </div>

          <Button onClick={handleSaveNotifications} disabled={savingNotifications}>
            {savingNotifications ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Preferências'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Seção 4: Link de Indicação */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            <CardTitle>Link de Indicação</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug Personalizado (opcional)
            </Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 border rounded-md px-3">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  slimquality.com.br/
                </span>
                <Input
                  id="slug"
                  placeholder="seu-nome"
                  value={slug}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setSlug(value);
                    setSlugStatus(null);
                  }}
                  className="border-0 shadow-none focus-visible:ring-0 px-0"
                />
              </div>
              <Button
                onClick={handleCheckSlug}
                variant="outline"
                disabled={checkingSlug || !slug.trim()}
              >
                {checkingSlug ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verificando...
                  </>
                ) : (
                  'Verificar'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Personalize seu link de indicação. Use apenas letras minúsculas, números e hífen.
              {!slug && (
                <span className="block mt-1 text-orange-600 dark:text-orange-400">
                  💡 Se deixar em branco, será usado seu código: <strong>{affiliate?.referralCode}</strong>
                </span>
              )}
            </p>
            {slugStatus && (
              <p className={`text-xs font-medium ${slugStatus.available ? 'text-success' : 'text-destructive'}`}>
                {slugStatus.available ? '✅' : '❌'} {slugStatus.message}
              </p>
            )}
          </div>

          {/* Preview do Link */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-xs text-muted-foreground">Seu link ficará assim:</p>
            <p className="font-mono text-sm font-medium break-all">
              https://slimquality.com.br?ref={slug || affiliate?.referralCode || 'seu-codigo'}
            </p>
          </div>

          <Button onClick={handleSaveSlug} disabled={slugStatus !== null && !slugStatus.available}>
            Salvar Slug
          </Button>
        </CardContent>
      </Card>

      {/* Seção 5: Segurança */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Segurança</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Senha</Label>
            <Button
              variant="outline"
              onClick={() => setShowPasswordModal(true)}
            >
              Alterar Senha
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Autenticação em 2 Fatores</Label>
            <Button variant="outline" disabled>Ativar 2FA (Em breve)</Button>
            <p className="text-xs text-muted-foreground">
              Adicione uma camada extra de segurança à sua conta
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Alteração de Senha */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e escolha uma nova senha segura
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Digite sua senha atual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Digite a nova senha (mín. 8 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {newPassword && newPassword.length < 8 && (
                <p className="text-xs text-destructive">
                  A senha deve ter no mínimo 8 caracteres
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a nova senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">
                  As senhas não conferem
                </p>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  <p className="font-semibold mb-1">Dicas para uma senha segura:</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>Use no mínimo 8 caracteres</li>
                    <li>Combine letras maiúsculas e minúsculas</li>
                    <li>Inclua números e símbolos</li>
                    <li>Evite informações pessoais</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="flex-1"
                disabled={changingPassword}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="flex-1"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal "Já tem Asaas?" */}
      <Dialog open={showAsaasModal} onOpenChange={setShowAsaasModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {asaasFlow === 'question' && 'Configuração de Pagamento'}
              {asaasFlow === 'has-asaas' && 'Digite sua Wallet ID'}
              {asaasFlow === 'no-asaas' && 'Criar Conta no Asaas'}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="space-y-4">
              {/* Pergunta inicial */}
              {asaasFlow === 'question' && (
                <>
                  <p className="text-center">Você já tem uma conta no Asaas?</p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setAsaasFlow('has-asaas')}
                      className="flex-1"
                    >
                      ✅ Sim, já tenho
                    </Button>
                    <Button
                      onClick={() => setAsaasFlow('no-asaas')}
                      variant="outline"
                      className="flex-1"
                    >
                      ❌ Não tenho
                    </Button>
                  </div>
                </>
              )}

              {/* Fluxo: Já tem Asaas */}
              {asaasFlow === 'has-asaas' && (
                <>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Ótimo! Digite sua Wallet ID do Asaas para configurar o recebimento automático das comissões.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="modalWalletId">Wallet ID</Label>
                      <Input
                        id="modalWalletId"
                        placeholder="00000000-0000-0000-0000-000000000000"
                        value={walletId}
                        onChange={(e) => setWalletId(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAsaasModal(false);
                        setShowWalletHelp(true);
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      Não sei onde encontrar minha Wallet ID
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setAsaasFlow('question')}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={async () => {
                        await handleUpdateWallet();
                        if (walletStatus.valid) {
                          setShowAsaasModal(false);
                          setAsaasFlow('question');
                        }
                      }}
                      disabled={validatingWallet || !walletId.trim()}
                      className="flex-1"
                    >
                      {validatingWallet ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Validando...
                        </>
                      ) : (
                        'Configurar'
                      )}
                    </Button>
                  </div>
                </>
              )}

              {/* Fluxo: Não tem Asaas */}
              {asaasFlow === 'no-asaas' && (
                <>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sem problemas! Você precisa criar uma conta gratuita no Asaas para receber suas comissões.
                    </p>

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Por que o Asaas?
                      </h4>
                      <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <li>• Recebimento automático das comissões</li>
                        <li>• Transferência gratuita para sua conta</li>
                        <li>• Plataforma segura e confiável</li>
                        <li>• Sem taxas para afiliados</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold">Como criar sua conta:</h4>
                      <ol className="text-sm space-y-1 list-decimal list-inside">
                        <li>Clique em "Criar Conta Asaas" abaixo</li>
                        <li>Faça seu cadastro gratuito</li>
                        <li>Anote sua Wallet ID</li>
                        <li>Volte aqui e configure</li>
                      </ol>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setAsaasFlow('question')}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <a
                      href="https://www.asaas.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Criar Conta Asaas
                      </Button>
                    </a>
                  </div>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      {/* Modal de Ajuda - Wallet ID */}
      <Dialog open={showWalletHelp} onOpenChange={setShowWalletHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Como Encontrar Sua Wallet ID</DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  O que é a Wallet ID?
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  É o identificador único da sua carteira no Asaas, necessário para receber suas comissões automaticamente.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Passo a passo:</h4>
                <ol className="space-y-2 list-decimal list-inside text-sm">
                  <li>Acesse sua conta no <strong>Asaas</strong> (asaas.com)</li>
                  <li>Vá em <strong>"Configurações"</strong> → <strong>"Integrações"</strong> → <strong>"API"</strong></li>
                  <li>Procure por <strong>"Wallet ID"</strong> ou <strong>"ID da Carteira"</strong></li>
                  <li>Copie o código no formato: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">00000000-0000-0000-0000-000000000000</code></li>
                  <li>Cole aqui e clique em <strong>"Configurar"</strong></li>
                </ol>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">Não tem conta no Asaas?</p>
                    <p className="text-amber-800 dark:text-amber-200 mt-1">
                      Você precisa criar uma conta gratuita no Asaas para receber suas comissões.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href="https://www.asaas.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Criar Conta Asaas
                  </Button>
                </a>
                <Button onClick={() => setShowWalletHelp(false)} className="flex-1">
                  Entendi
                </Button>
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}
