
import { useAuth } from '@/contexts/AuthContext';
import { AffiliateRegistration } from '@/components/affiliates/AffiliateRegistration';
import { AffiliatesDashboard } from '@/components/affiliates/AffiliatesDashboard';
import { AffiliatesReferralsList } from '@/components/affiliates/AffiliatesReferralsList';
import { AffiliatesCommissionsList } from '@/components/affiliates/AffiliatesCommissionsList';
import { AffiliatesTools } from '@/components/affiliates/AffiliatesTools';
import { useMyAffiliate } from '@/hooks/useAffiliate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Award } from 'lucide-react';

export default function Afiliados() {
  const { profile } = useAuth();
  const { data: affiliate, isLoading, refetch } = useMyAffiliate();

  const handleRegistrationSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-comademig-blue"></div>
      </div>
    );
  }

  // Verificar se usuário está ativo e adimplente
  const canParticipate = profile?.status === 'ativo';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Programa de Afiliados</h1>
          <p className="text-muted-foreground">Ganhe comissões indicando novos membros</p>
        </div>
        {affiliate && affiliate.status === 'active' && (
          <Badge variant="secondary" className="text-sm bg-green-100 text-green-800">
            <Award className="w-4 h-4 mr-1" />
            Afiliado Ativo
          </Badge>
        )}
      </div>

      {!canParticipate && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Para participar do Programa de Afiliados, você precisa estar com a filiação ativa e em dia com suas obrigações.
          </AlertDescription>
        </Alert>
      )}

      {canParticipate && (
        <>
          {affiliate ? (
            <>
              {/* Mensagem de Status Suspenso */}
              {affiliate.status === 'suspended' && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Seu cadastro de afiliado está suspenso. Entre em contato com o suporte para mais informações.
                  </AlertDescription>
                </Alert>
              )}

              {/* Tabs do Painel */}
              <Tabs defaultValue="dashboard" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="referrals">Indicações</TabsTrigger>
                  <TabsTrigger value="commissions">Comissões</TabsTrigger>
                  <TabsTrigger value="tools">Ferramentas</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard">
                  <AffiliatesDashboard affiliate={affiliate} />
                </TabsContent>

                <TabsContent value="referrals">
                  <AffiliatesReferralsList affiliate={affiliate} />
                </TabsContent>

                <TabsContent value="commissions">
                  <AffiliatesCommissionsList affiliate={affiliate} />
                </TabsContent>

                <TabsContent value="tools">
                  <AffiliatesTools affiliate={affiliate} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <AffiliateRegistration onSuccess={handleRegistrationSuccess} />
          )}
        </>
      )}
    </div>
  );
}
