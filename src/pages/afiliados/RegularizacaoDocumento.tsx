/**
 * Página de Regularização de Documento
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Página para afiliados existentes cadastrarem seu CPF/CNPJ
 * conforme nova exigência regulatória.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Shield,
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Phone
} from "lucide-react";
import { DocumentInput } from "@/components/ui/document-input";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

interface RegularizationStatus {
  hasRequest: boolean;
  request?: {
    id: string;
    status: 'pending' | 'completed' | 'expired' | 'cancelled';
    expires_at: string;
    reminder_count: number;
  };
  daysRemaining: number;
  isExpired: boolean;
  canComplete: boolean;
  affiliate: {
    id: string;
    name: string;
    email: string;
    document?: string;
    document_type?: string;
    is_active: boolean;
  };
}

export default function RegularizacaoDocumento() {
  const navigate = useNavigate();
  const { affiliateId } = useParams();
  const { toast } = useToast();
  const { user, isAuthenticated } = useCustomerAuth();
  
  const [status, setStatus] = useState<RegularizationStatus | null>(null);
  const [document, setDocument] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Redirecionar se não autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/afiliados/regularizacao');
    }
  }, [isAuthenticated, navigate]);

  // Carregar status de regularização
  useEffect(() => {
    const loadRegularizationStatus = async () => {
      if (!affiliateId) return;

      try {
        const response = await fetch(`/api/affiliates/${affiliateId}/regularization-status`, {
          headers: {
            'Authorization': `Bearer ${user?.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erro ao carregar status');
        }

        const result = await response.json();
        setStatus(result.data);
        
        // Se já tem documento, pré-preencher
        if (result.data.affiliate.document) {
          setDocument(result.data.affiliate.document);
        }
      } catch (error) {
        console.error('Erro ao carregar status:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as informações de regularização",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadRegularizationStatus();
  }, [affiliateId, user, toast]);

  const handleDocumentSubmit = async () => {
    if (!document.trim() || !affiliateId) {
      toast({
        title: "Documento obrigatório",
        description: "Por favor, digite seu CPF ou CNPJ",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/affiliates/${affiliateId}/document`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({ document }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar documento');
      }

      const result = await response.json();
      
      toast({
        title: "Documento atualizado!",
        description: "Seu documento foi cadastrado com sucesso. Sua conta foi regularizada.",
      });

      // Recarregar status
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Erro ao atualizar documento:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar documento",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysRemainingColor = (days: number) => {
    if (days <= 0) return 'text-red-600';
    if (days <= 7) return 'text-orange-600';
    if (days <= 15) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressPercentage = (daysRemaining: number, totalDays: number = 30) => {
    const elapsed = totalDays - daysRemaining;
    return Math.max(0, Math.min(100, (elapsed / totalDays) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando informações...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Informações não encontradas</h2>
              <p className="text-muted-foreground mb-4">
                Não foi possível carregar as informações de regularização.
              </p>
              <Button onClick={() => navigate('/afiliados/dashboard')}>
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Se já regularizado
  if (status.affiliate.document && status.affiliate.document_type) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-green-200">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-700">
                Documento Regularizado
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Status: Regularizado</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Documento:</span>
                    <span className="font-medium">{status.affiliate.document}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Tipo:</span>
                    <span className="font-medium">{status.affiliate.document_type}</span>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Seu documento foi validado com sucesso. Sua conta está regularizada
                  e você pode continuar operando normalmente.
                </p>
                
                <Button onClick={() => navigate('/afiliados/dashboard')} className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Regularização de Documento
            </CardTitle>
            <p className="text-muted-foreground">
              Para continuar como afiliado, você precisa cadastrar seu CPF ou CNPJ
            </p>
          </CardHeader>
        </Card>

        {/* Status da Regularização */}
        {status.hasRequest && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Status da Regularização
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Prazo restante:</span>
                <Badge 
                  variant={status.isExpired ? "destructive" : status.daysRemaining <= 7 ? "secondary" : "default"}
                  className={getDaysRemainingColor(status.daysRemaining)}
                >
                  {status.isExpired ? 'Expirado' : `${status.daysRemaining} dias`}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso do prazo</span>
                  <span>{Math.round(getProgressPercentage(status.daysRemaining))}%</span>
                </div>
                <Progress value={getProgressPercentage(status.daysRemaining)} className="h-2" />
              </div>

              {status.isExpired && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    O prazo para regularização expirou. Sua conta pode ser suspensa.
                    Cadastre seu documento o quanto antes.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informações do Afiliado */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Suas Informações
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Nome:</span>
              <span className="font-medium">{status.affiliate.name}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="font-medium">{status.affiliate.email}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={status.affiliate.is_active ? "default" : "destructive"}>
                {status.affiliate.is_active ? 'Ativo' : 'Suspenso'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Explicação sobre a necessidade */}
        <Card className="shadow-lg border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-blue-100 p-2 shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-900">
                  Por que preciso cadastrar meu documento?
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    • <strong>Conformidade Legal:</strong> Nova exigência da Receita Federal para programas de afiliados
                  </p>
                  <p>
                    • <strong>Segurança:</strong> Validação de identidade para proteção contra fraudes
                  </p>
                  <p>
                    • <strong>Pagamentos:</strong> Necessário para continuar recebendo comissões
                  </p>
                  <p>
                    • <strong>Transparência:</strong> Cumprimento das normas de compliance fiscal
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de Documento */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Cadastrar Documento
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Digite seu CPF (pessoa física) ou CNPJ (pessoa jurídica)
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <DocumentInput
              value={document}
              onChange={setDocument}
              showAsaasValidation={true}
              autoStartAsaasValidation={true}
              onAsaasValidation={(result) => {
                console.log('Resultado Asaas:', result);
              }}
              placeholder="Digite seu CPF ou CNPJ"
              className="text-lg"
            />

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Importante:</p>
                  <p>
                    Seu documento será validado automaticamente com a Receita Federal
                    através do sistema Asaas. Este processo pode levar alguns minutos.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/afiliados/dashboard')}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <Button
                onClick={handleDocumentSubmit}
                disabled={!document.trim() || submitting}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Regularizar Documento
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informações de Segurança */}
        <Card className="shadow-lg border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-sm text-green-800">
              <Shield className="h-4 w-4" />
              <span>
                <strong>Seus dados estão seguros:</strong> Utilizamos criptografia de ponta
                e cumprimos a LGPD. Seu documento é usado apenas para validação.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}