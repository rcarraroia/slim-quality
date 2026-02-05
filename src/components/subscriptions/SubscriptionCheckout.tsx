/**
 * Componente de checkout para assinaturas
 * Task 14.2: Criar componentes React para fluxo de assinatura
 * 
 * Integrado com SubscriptionFrontendService
 * Mantém interface consistente com produtos físicos
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Users, Gift, Loader2, CreditCard, Smartphone, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { subscriptionFrontendService } from '@/services/frontend/subscription.service';
import type { CreateSubscriptionPaymentData, OrderItem } from '@/services/frontend/subscription.service';
import SubscriptionProgress from './SubscriptionProgress';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  orderItems: OrderItem[];
}

interface SubscriptionCheckoutProps {
  plan: SubscriptionPlan;
  onSubscriptionComplete?: (subscriptionId: string) => void;
  onClose?: () => void;
  className?: string;
  affiliateData?: {
    referralCode?: string;
    affiliateId?: string;
  };
}

type PaymentMethodType = 'CREDIT_CARD' | 'PIX';

interface PaymentMethod {
  type: PaymentMethodType;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}

export default function SubscriptionCheckout({
  plan,
  onSubscriptionComplete,
  onClose,
  className,
  affiliateData
}: SubscriptionCheckoutProps) {
  const { toast } = useToast();
  const { user: loggedUser, isAuthenticated } = useCustomerAuth();
  
  // Estados do componente
  const [currentStep, setCurrentStep] = useState<'form' | 'processing' | 'polling' | 'success' | 'error'>('form');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pollingProgress, setPollingProgress] = useState({ current: 0, total: 15 });
  
  // Método de pagamento selecionado
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>({ type: 'PIX' });
  
  // Dados do cliente
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    confirmPassword: '',
    address: {
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: ''
    }
  });

  // Estados de loading do serviço
  const [loadingStates, setLoadingStates] = useState(subscriptionFrontendService.getLoadingStates());

  // Pré-preencher dados se usuário estiver logado
  useEffect(() => {
    if (isAuthenticated && loggedUser) {
      setCustomerData(prev => ({
        ...prev,
        name: loggedUser.name || prev.name,
        email: loggedUser.email || prev.email,
        phone: loggedUser.phone || prev.phone
      }));
    }
  }, [isAuthenticated, loggedUser]);

  // Monitorar estados de loading
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStates(subscriptionFrontendService.getLoadingStates());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  /**
   * Atualiza dados do cliente
   */
  const updateCustomerData = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '');
      setCustomerData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setCustomerData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  /**
   * Valida dados do formulário
   */
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validações básicas
    if (!customerData.name || customerData.name.length < 3) {
      errors.push('Nome deve ter pelo menos 3 caracteres');
    }

    if (!customerData.email || !customerData.email.includes('@')) {
      errors.push('Email inválido');
    }

    if (!customerData.phone) {
      errors.push('Telefone é obrigatório');
    }

    if (!customerData.cpf || customerData.cpf.replace(/\D/g, '').length !== 11) {
      errors.push('CPF inválido');
    }

    // Validar senha se não estiver logado
    if (!isAuthenticated) {
      if (!customerData.password || customerData.password.length < 6) {
        errors.push('Senha deve ter pelo menos 6 caracteres');
      }

      if (customerData.password !== customerData.confirmPassword) {
        errors.push('Senhas não coincidem');
      }
    }

    // Validar dados do cartão se necessário
    if (selectedPaymentMethod.type === 'CREDIT_CARD') {
      const card = selectedPaymentMethod.creditCard;
      if (!card?.holderName || !card?.number || !card?.expiryMonth || !card?.expiryYear || !card?.ccv) {
        errors.push('Dados do cartão incompletos');
      }

      // Validar endereço para cartão
      if (!customerData.address.zipCode || !customerData.address.number) {
        errors.push('CEP e número são obrigatórios para pagamento com cartão');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  /**
   * Processa o checkout de assinatura
   */
  const handleCheckout = async () => {
    try {
      setCurrentStep('processing');

      // Validar formulário
      const validation = validateForm();
      if (!validation.isValid) {
        toast({
          title: "Dados inválidos",
          description: validation.errors.join(', '),
          variant: "destructive"
        });
        setCurrentStep('form');
        return;
      }

      // Preparar dados para o serviço
      const paymentData: CreateSubscriptionPaymentData = {
        userId: loggedUser?.id || 'temp-user-id', // TODO: Implementar criação de usuário
        planId: plan.id,
        amount: plan.price,
        orderItems: plan.orderItems,
        customerData: {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          cpf: customerData.cpf.replace(/\D/g, ''),
          address: customerData.address
        },
        paymentMethod: selectedPaymentMethod,
        affiliateData
      };

      // Criar pagamento
      const result = await subscriptionFrontendService.createSubscriptionPayment(paymentData);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar pagamento');
      }

      // Salvar ID do pagamento e iniciar polling
      setPaymentId(result.data!.paymentId);
      setCurrentStep('polling');

      // Iniciar polling do status
      const pollingResult = await subscriptionFrontendService.pollPaymentStatus(
        result.data!.paymentId,
        (attempt, maxAttempts) => {
          setPollingProgress({ current: attempt, total: maxAttempts });
        }
      );

      if (pollingResult.success && pollingResult.data?.status === 'CONFIRMED') {
        setSubscriptionId(pollingResult.data.subscriptionId || 'sub_created');
        setCurrentStep('success');
        
        toast({
          title: "🎉 Assinatura ativada!",
          description: "Sua assinatura foi criada com sucesso. Bem-vindo!",
          duration: 5000
        });

        onSubscriptionComplete?.(pollingResult.data.subscriptionId || 'sub_created');
      } else {
        throw new Error(pollingResult.error || 'Pagamento não foi confirmado');
      }

    } catch (error) {
      console.error('Erro no checkout de assinatura:', error);
      setCurrentStep('error');
      
      const errorMessage = subscriptionFrontendService.formatErrorMessage(
        error instanceof Error ? error.message : 'Erro desconhecido'
      );

      toast({
        title: "Erro no checkout",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  /**
   * Reinicia o processo
   */
  const handleRetry = () => {
    setCurrentStep('form');
    setPaymentId(null);
    setSubscriptionId(null);
    setPollingProgress({ current: 0, total: 15 });
    subscriptionFrontendService.resetLoadingStates();
  };

  /**
   * Renderiza o formulário de dados
   */
  const renderForm = () => (
    <div className="space-y-4">
      {/* Seletor de método de pagamento */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Método de pagamento:</h4>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={selectedPaymentMethod.type === 'PIX' ? 'default' : 'outline'}
            onClick={() => setSelectedPaymentMethod({ type: 'PIX' })}
            className="flex items-center gap-2"
          >
            <Smartphone className="h-4 w-4" />
            PIX
          </Button>
          <Button
            variant={selectedPaymentMethod.type === 'CREDIT_CARD' ? 'default' : 'outline'}
            onClick={() => setSelectedPaymentMethod({ type: 'CREDIT_CARD', creditCard: { holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '' } })}
            className="flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Cartão
          </Button>
        </div>
      </div>

      {/* Dados do cartão se selecionado */}
      {selectedPaymentMethod.type === 'CREDIT_CARD' && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-semibold text-sm">Dados do cartão:</h4>
          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              placeholder="Nome no cartão"
              value={selectedPaymentMethod.creditCard?.holderName || ''}
              onChange={(e) => setSelectedPaymentMethod(prev => ({
                ...prev,
                creditCard: { ...prev.creditCard!, holderName: e.target.value }
              }))}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="Número do cartão"
              value={selectedPaymentMethod.creditCard?.number || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                setSelectedPaymentMethod(prev => ({
                  ...prev,
                  creditCard: { ...prev.creditCard!, number: value }
                }));
              }}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Mês"
                value={selectedPaymentMethod.creditCard?.expiryMonth || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                  setSelectedPaymentMethod(prev => ({
                    ...prev,
                    creditCard: { ...prev.creditCard!, expiryMonth: value }
                  }));
                }}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="Ano"
                value={selectedPaymentMethod.creditCard?.expiryYear || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setSelectedPaymentMethod(prev => ({
                    ...prev,
                    creditCard: { ...prev.creditCard!, expiryYear: value }
                  }));
                }}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="CCV"
                value={selectedPaymentMethod.creditCard?.ccv || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setSelectedPaymentMethod(prev => ({
                    ...prev,
                    creditCard: { ...prev.creditCard!, ccv: value }
                  }));
                }}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Dados pessoais */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Dados pessoais:</h4>
        <div className="grid grid-cols-1 gap-3">
          <input
            type="text"
            placeholder="Nome completo *"
            value={customerData.name}
            onChange={(e) => updateCustomerData('name', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="email"
              placeholder="Email *"
              value={customerData.email}
              onChange={(e) => updateCustomerData('email', e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              required
            />
            <input
              type="tel"
              placeholder="Telefone *"
              value={customerData.phone}
              onChange={(e) => updateCustomerData('phone', e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              required
            />
          </div>
          <input
            type="text"
            placeholder="CPF *"
            value={customerData.cpf}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 11);
              const formatted = value
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
              updateCustomerData('cpf', formatted);
            }}
            className="w-full px-3 py-2 border rounded-md text-sm"
            required
          />
        </div>
      </div>

      {/* Campos de senha se não estiver logado */}
      {!isAuthenticated && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Criar conta:</h4>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Senha * (mínimo 6 caracteres)"
              value={customerData.password}
              onChange={(e) => updateCustomerData('password', e.target.value)}
              className="w-full px-3 py-2 pr-10 border rounded-md text-sm"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmar senha *"
              value={customerData.confirmPassword}
              onChange={(e) => updateCustomerData('confirmPassword', e.target.value)}
              className={`w-full px-3 py-2 pr-10 border rounded-md text-sm ${
                customerData.confirmPassword && customerData.password !== customerData.confirmPassword
                  ? 'border-red-500'
                  : ''
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {customerData.confirmPassword && customerData.password !== customerData.confirmPassword && (
            <p className="text-xs text-red-500">As senhas não coincidem</p>
          )}
        </div>
      )}

      {/* Endereço se cartão selecionado */}
      {selectedPaymentMethod.type === 'CREDIT_CARD' && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Endereço (obrigatório para cartão):</h4>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="CEP *"
                value={customerData.address.zipCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                  const formatted = value.replace(/(\d{5})(\d)/, '$1-$2');
                  updateCustomerData('address.zipCode', formatted);
                }}
                className="px-3 py-2 border rounded-md text-sm"
                required
              />
              <input
                type="text"
                placeholder="Rua"
                value={customerData.address.street}
                onChange={(e) => updateCustomerData('address.street', e.target.value)}
                className="col-span-2 px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Número *"
                value={customerData.address.number}
                onChange={(e) => updateCustomerData('address.number', e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
                required
              />
              <input
                type="text"
                placeholder="Complemento"
                value={customerData.address.complement}
                onChange={(e) => updateCustomerData('address.complement', e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="Bairro"
                value={customerData.address.neighborhood}
                onChange={(e) => updateCustomerData('address.neighborhood', e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Cidade"
                value={customerData.address.city}
                onChange={(e) => updateCustomerData('address.city', e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="Estado"
                value={customerData.address.state}
                onChange={(e) => updateCustomerData('address.state', e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
                maxLength={2}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={className}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Assinar {plan.name}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Informações do plano */}
          <div className="space-y-3">
            <div className="text-center">
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <p className="text-2xl font-bold text-primary mt-2">
                R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                <span className="text-sm font-normal text-muted-foreground">
                  /{plan.interval === 'monthly' ? 'mês' : 'ano'}
                </span>
              </p>
            </div>
            
            {/* Features do plano */}
            <div className="space-y-2">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Informações do afiliado */}
          {affiliateData?.referralCode && (
            <Alert className="border-primary/20 bg-primary/5">
              <Users className="h-4 w-4 text-primary" />
              <AlertDescription className="space-y-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  <span className="font-medium">Assinatura via indicação</span>
                </div>
                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs">
                    Código: {affiliateData.referralCode}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Sua assinatura ajudará quem te indicou a ganhar comissão!
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Conteúdo baseado no step atual */}
          {currentStep === 'form' && (
            <>
              {renderForm()}
              
              <Button
                onClick={handleCheckout}
                disabled={loadingStates.creatingPayment}
                className="w-full"
                size="lg"
              >
                {loadingStates.creatingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  `Assinar por R$ ${plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                )}
              </Button>
            </>
          )}

          {(currentStep === 'processing' || currentStep === 'polling') && (
            <SubscriptionProgress
              step={currentStep}
              paymentMethod={selectedPaymentMethod.type}
              progress={pollingProgress}
            />
          )}

          {currentStep === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-green-700">Assinatura Ativada!</h3>
                <p className="text-sm text-muted-foreground">
                  Sua assinatura {plan.name} foi criada com sucesso.
                </p>
              </div>
              <Button onClick={onClose} className="w-full">
                Continuar
              </Button>
            </div>
          )}

          {currentStep === 'error' && (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">❌</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-700">Erro no Checkout</h3>
                <p className="text-sm text-muted-foreground">
                  Não foi possível processar sua assinatura.
                </p>
              </div>
              <div className="space-y-2">
                <Button onClick={handleRetry} className="w-full">
                  Tentar Novamente
                </Button>
                <Button onClick={onClose} variant="outline" className="w-full">
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Informações de segurança */}
          {currentStep === 'form' && (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Assinatura 100% segura</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Cancele quando quiser</span>
              </div>
              {affiliateData?.referralCode && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Afiliado será creditado automaticamente</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}