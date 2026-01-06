import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Shield, Bell, User, CheckCircle2, AlertCircle, Info, ExternalLink, Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  
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

  // Carregar dados do afiliado ao montar componente
  useEffect(() => {
    loadAffiliateData();
  }, []);

  const loadAffiliateData = async () => {
    try {
      setLoading(true);
      const { isAffiliate, affiliate: affiliateData } = await affiliateFrontendService.checkAffiliateStatus();
      
      if (isAffiliate && affiliateData) {
        setAffiliate(affiliateData);
        
        // Configurar status da Wallet ID
        if (affiliateData.walletId) {
          setWalletId(affiliateData.walletId);
          setWalletStatus({
            configured: true,
            valid: true, // Assumir válida se está salva
            lastTested: new Date().toISOString()
          });
        } else {
          setWalletStatus({ configured: false });
        }
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
      const stateSelect = document.getElementById('estado') as HTMLSelectElement;
      const cepInput = document.getElementById('cep') as HTMLInputElement;
      const birthDateInput = document.getElementById('birthDate') as HTMLInputElement;

      const formData = {
        name: nameInput?.value || '',
        email: emailInput?.value || '',
        phone: phoneInput?.value || '',
        city: cityInput?.value || null,
        state: stateSelect?.value || null,
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

      // Atualizar no banco
      const { error } = await supabase
        .from('affiliates')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          state: formData.state,
          cep: formData.cep,
          birth_date: formData.birth_date,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (error) throw error;

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

  const handleSaveNotifications = () => {
    toast({ title: "Preferências de notificações salvas!" });
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
              <Input id="email" type="email" defaultValue={affiliate?.email || ""} />
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
                defaultValue={affiliate?.city || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select defaultValue={affiliate?.state || ""}>
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
                defaultValue={affiliate?.cep || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input 
              id="birthDate" 
              type="date" 
              defaultValue={affiliate?.birthDate || ""}
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
            <div className={`border rounded-lg p-4 space-y-2 ${
              walletStatus.valid 
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
                    <p className={`text-xs mt-1 ${
                      walletStatus.valid ? 'text-success' : 'text-destructive'
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
            <Checkbox id="notif-comissao" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-mensal" className="cursor-pointer">Resumo mensal</Label>
              <p className="text-sm text-muted-foreground">Receber email no resumo mensal</p>
            </div>
            <Checkbox id="notif-mensal" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-afiliados" className="cursor-pointer">Novos afiliados</Label>
              <p className="text-sm text-muted-foreground">Notificar sobre novos afiliados na rede</p>
            </div>
            <Checkbox id="notif-afiliados" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-bonus" className="cursor-pointer">Promoções e bônus</Label>
              <p className="text-sm text-muted-foreground">Avisos de promoções e bônus</p>
            </div>
            <Checkbox id="notif-bonus" />
          </div>

          <Button onClick={handleSaveNotifications}>Salvar Preferências</Button>
        </CardContent>
      </Card>

      {/* Seção 4: Segurança */}
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
            <Button variant="outline">Alterar Senha</Button>
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
