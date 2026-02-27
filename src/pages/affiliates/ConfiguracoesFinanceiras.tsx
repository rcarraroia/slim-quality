/**
 * Configurações Financeiras - ETAPA 2
 * 
 * Página para configuração de Wallet ID do afiliado
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { supabase } from '@/config/supabase';
import { ExistingWalletForm } from '../../components/affiliates/ExistingWalletForm';
import { CreateAsaasAccountForm } from '../../components/affiliates/CreateAsaasAccountForm';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  document: string;
  document_type: 'CPF' | 'CNPJ';
  affiliate_type: 'individual' | 'logista';
  financial_status: 'financeiro_pendente' | 'ativo';
  wallet_id: string | null;
  wallet_configured_at: string | null;
}

export function ConfiguracoesFinanceiras() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<'existing' | 'create' | null>(null);

  useEffect(() => {
    loadAffiliateData();
  }, []);

  async function loadAffiliateData() {
    try {
      setLoading(true);

      // Buscar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Buscar dados do afiliado
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar afiliado:', error);
        return;
      }

      setAffiliate(data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSuccess() {
    // Recarregar dados e redirecionar para dashboard
    loadAffiliateData();
    setTimeout(() => {
      navigate('/afiliados/dashboard');
    }, 2000);
  }

  function handleCancel() {
    setSelectedFlow(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar dados do afiliado. Tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Se wallet já configurada, exibir informações
  if (affiliate.financial_status === 'ativo' && affiliate.wallet_id) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Wallet Configurada</CardTitle>
                <CardDescription>
                  Sua carteira digital está ativa e pronta para receber comissões
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Wallet ID</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ...{affiliate.wallet_id.slice(-8)}
                  </p>
                </div>
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            {affiliate.wallet_configured_at && (
              <div className="text-sm text-muted-foreground">
                Configurada em {new Date(affiliate.wallet_configured_at).toLocaleDateString('pt-BR')}
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Para alterar sua wallet, entre em contato com o suporte.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => navigate('/afiliados/dashboard')}
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se wallet não configurada, exibir opções
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Configurações Financeiras</h1>
        <p className="text-muted-foreground mt-2">
          Configure sua carteira digital para começar a receber comissões
        </p>
      </div>

      <Alert variant="default" className="mb-6 border-orange-200 bg-orange-50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-900">
          Configure sua carteira digital para liberar seu link de indicação e começar a receber comissões.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Escolha uma opção</CardTitle>
          <CardDescription>
            Você pode informar uma wallet existente ou criar uma nova conta no Asaas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedFlow || undefined} onValueChange={(value) => setSelectedFlow(value as 'existing' | 'create')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Já tenho conta Asaas</TabsTrigger>
              <TabsTrigger value="create">Criar conta Asaas</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="mt-6">
              <ExistingWalletForm 
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </TabsContent>

            <TabsContent value="create" className="mt-6">
              <CreateAsaasAccountForm 
                affiliate={affiliate}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
