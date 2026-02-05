/**
 * PaymentFirstFlowService - Serviço Principal do Fluxo Pagamento → Conta
 * 
 * Implementa o orquestrador principal do novo fluxo de registro
 * conforme Requirement 1: Processamento de Pagamento Prioritário
 */

import { pollingService } from './PollingService';
import { fallbackSystem } from './FallbackSystem';
import { createClient } from '@supabase/supabase-js';

// Função para obter cliente Supabase (permite mocking nos testes)
const getSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Configurações do Supabase não encontradas');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Interfaces e tipos principais

export interface RegistrationData {
  // Dados pessoais
  nome: string;
  email: string;
  password: string;
  cpf: string;
  telefone: string;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  
  // Dados profissionais
  tipo_membro: 'bispo' | 'pastor' | 'diacono' | 'membro';
  
  // Dados de pagamento
  plan_id: string;
  payment_method: 'CREDIT_CARD' | 'PIX';
  card_data?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  
  // Dados de afiliado (opcional)
  affiliate_id?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ProcessingStep {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  error?: string;
}

export interface PaymentFirstFlowResult {
  success: boolean;
  user_id?: string;
  payment_id?: string;
  asaas_customer_id?: string;
  asaas_subscription_id?: string;
  steps: ProcessingStep[];
  error?: string;
  fallback_stored?: boolean;
  requires_manual_intervention?: boolean;
}

export interface FlowContext {
  registration_data: RegistrationData;
  asaas_customer_id?: string;
  payment_id?: string;
  asaas_subscription_id?: string;
  user_id?: string;
  steps: ProcessingStep[];
  start_time: number;
}

export class PaymentFirstFlowService {
  private static instance: PaymentFirstFlowService;
  private activeFlows = new Map<string, FlowContext>();

  static getInstance(): PaymentFirstFlowService {
    if (!PaymentFirstFlowService.instance) {
      PaymentFirstFlowService.instance = new PaymentFirstFlowService();
    }
    return PaymentFirstFlowService.instance;
  }

  /**
   * Requirement 1.1: Validar dados antes de qualquer processamento
   */
  validateRegistrationData(data: RegistrationData): ValidationResult {
    const errors: ValidationError[] = [];

    // Validação de dados pessoais
    if (!data.nome || data.nome.trim().length < 2) {
      errors.push({
        field: 'nome',
        message: 'Nome deve ter pelo menos 2 caracteres',
        code: 'INVALID_NAME'
      });
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push({
        field: 'email',
        message: 'Email inválido',
        code: 'INVALID_EMAIL'
      });
    }

    if (!data.password || data.password.length < 6) {
      errors.push({
        field: 'password',
        message: 'Senha deve ter pelo menos 6 caracteres',
        code: 'INVALID_PASSWORD'
      });
    }

    if (!data.cpf || !this.isValidCPF(data.cpf)) {
      errors.push({
        field: 'cpf',
        message: 'CPF inválido',
        code: 'INVALID_CPF'
      });
    }

    if (!data.telefone || !this.isValidPhone(data.telefone)) {
      errors.push({
        field: 'telefone',
        message: 'Telefone inválido',
        code: 'INVALID_PHONE'
      });
    }

    // Validação de endereço
    if (!data.endereco.cep || !this.isValidCEP(data.endereco.cep)) {
      errors.push({
        field: 'endereco.cep',
        message: 'CEP inválido',
        code: 'INVALID_CEP'
      });
    }

    if (!data.endereco.logradouro || data.endereco.logradouro.trim().length < 5) {
      errors.push({
        field: 'endereco.logradouro',
        message: 'Logradouro deve ter pelo menos 5 caracteres',
        code: 'INVALID_ADDRESS'
      });
    }

    if (!data.endereco.numero || data.endereco.numero.trim().length < 1) {
      errors.push({
        field: 'endereco.numero',
        message: 'Número é obrigatório',
        code: 'INVALID_NUMBER'
      });
    }

    if (!data.endereco.bairro || data.endereco.bairro.trim().length < 2) {
      errors.push({
        field: 'endereco.bairro',
        message: 'Bairro deve ter pelo menos 2 caracteres',
        code: 'INVALID_NEIGHBORHOOD'
      });
    }

    if (!data.endereco.cidade || data.endereco.cidade.trim().length < 2) {
      errors.push({
        field: 'endereco.cidade',
        message: 'Cidade deve ter pelo menos 2 caracteres',
        code: 'INVALID_CITY'
      });
    }

    if (!data.endereco.estado || data.endereco.estado.length !== 2) {
      errors.push({
        field: 'endereco.estado',
        message: 'Estado deve ter 2 caracteres (UF)',
        code: 'INVALID_STATE'
      });
    }

    // Validação de tipo de membro
    const validMemberTypes = ['bispo', 'pastor', 'diacono', 'membro'];
    if (!data.tipo_membro || !validMemberTypes.includes(data.tipo_membro)) {
      errors.push({
        field: 'tipo_membro',
        message: 'Tipo de membro inválido',
        code: 'INVALID_MEMBER_TYPE'
      });
    }

    // Validação de plano
    if (!data.plan_id || data.plan_id.trim().length === 0) {
      errors.push({
        field: 'plan_id',
        message: 'Plano é obrigatório',
        code: 'INVALID_PLAN'
      });
    }

    // Validação de método de pagamento
    const validPaymentMethods = ['CREDIT_CARD', 'PIX'];
    if (!data.payment_method || !validPaymentMethods.includes(data.payment_method)) {
      errors.push({
        field: 'payment_method',
        message: 'Método de pagamento inválido',
        code: 'INVALID_PAYMENT_METHOD'
      });
    }

    // Validação específica para cartão de crédito
    if (data.payment_method === 'CREDIT_CARD') {
      if (!data.card_data) {
        errors.push({
          field: 'card_data',
          message: 'Dados do cartão são obrigatórios',
          code: 'MISSING_CARD_DATA'
        });
      } else {
        if (!data.card_data.holderName || data.card_data.holderName.trim().length < 2) {
          errors.push({
            field: 'card_data.holderName',
            message: 'Nome do portador inválido',
            code: 'INVALID_CARD_HOLDER'
          });
        }

        if (!data.card_data.number || !this.isValidCardNumber(data.card_data.number)) {
          errors.push({
            field: 'card_data.number',
            message: 'Número do cartão inválido',
            code: 'INVALID_CARD_NUMBER'
          });
        }

        if (!data.card_data.expiryMonth || !this.isValidMonth(data.card_data.expiryMonth)) {
          errors.push({
            field: 'card_data.expiryMonth',
            message: 'Mês de expiração inválido',
            code: 'INVALID_EXPIRY_MONTH'
          });
        }

        if (!data.card_data.expiryYear || !this.isValidYear(data.card_data.expiryYear)) {
          errors.push({
            field: 'card_data.expiryYear',
            message: 'Ano de expiração inválido',
            code: 'INVALID_EXPIRY_YEAR'
          });
        }

        if (!data.card_data.ccv || !this.isValidCCV(data.card_data.ccv)) {
          errors.push({
            field: 'card_data.ccv',
            message: 'CCV inválido',
            code: 'INVALID_CCV'
          });
        }
      }
    }

    // Validação de afiliado (se fornecido)
    if (data.affiliate_id && data.affiliate_id.trim().length === 0) {
      errors.push({
        field: 'affiliate_id',
        message: 'ID do afiliado inválido',
        code: 'INVALID_AFFILIATE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Requirement 1.2: Processar fluxo completo de pagamento → conta
   */
  async processRegistration(data: RegistrationData): Promise<PaymentFirstFlowResult> {
    const flowId = this.generateFlowId();
    const context: FlowContext = {
      registration_data: data,
      steps: [],
      start_time: Date.now()
    };

    this.activeFlows.set(flowId, context);

    try {
      console.log(`Iniciando Payment First Flow ${flowId}...`);

      // Etapa 1: Validação de dados
      this.addStep(context, 'validation', 'processing', 'Validando dados de entrada...');
      
      const validation = this.validateRegistrationData(data);
      if (!validation.isValid) {
        this.addStep(context, 'validation', 'failed', `Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
        
        return {
          success: false,
          steps: context.steps,
          error: `Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      this.addStep(context, 'validation', 'completed', 'Dados validados com sucesso');

      // Etapa 2: Criar cliente Asaas
      this.addStep(context, 'asaas_customer', 'processing', 'Criando cliente no Asaas...');
      
      try {
        const customerId = await this.createAsaasCustomer(data);
        context.asaas_customer_id = customerId;
        this.addStep(context, 'asaas_customer', 'completed', `Cliente Asaas criado: ${customerId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.addStep(context, 'asaas_customer', 'failed', `Erro ao criar cliente: ${errorMessage}`);
        
        return {
          success: false,
          steps: context.steps,
          error: `Erro ao criar cliente Asaas: ${errorMessage}`
        };
      }

      // Etapa 3: Processar pagamento
      this.addStep(context, 'payment', 'processing', 'Processando pagamento...');
      
      try {
        const paymentId = await this.processPayment(context);
        context.payment_id = paymentId;
        this.addStep(context, 'payment', 'completed', `Pagamento criado: ${paymentId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.addStep(context, 'payment', 'failed', `Erro ao processar pagamento: ${errorMessage}`);
        
        return {
          success: false,
          steps: context.steps,
          error: `Erro ao processar pagamento: ${errorMessage}`
        };
      }

      // Etapa 4: Aguardar confirmação via polling
      this.addStep(context, 'payment_confirmation', 'processing', 'Aguardando confirmação do pagamento...');
      
      try {
        const pollingResult = await pollingService.pollPaymentStatus({
          paymentId: context.payment_id!,
          timeout: 15,
          interval: 1,
          onStatusUpdate: (status) => {
            this.addStep(context, 'payment_confirmation', 'processing', `Status: ${status.status}`);
          }
        });

        if (!pollingResult.success) {
          if (pollingResult.timedOut) {
            // Timeout - armazenar no fallback system
            this.addStep(context, 'payment_confirmation', 'failed', 'Timeout na confirmação - processo será retomado automaticamente');
            
            await this.storePendingSubscription(context);
            
            return {
              success: false,
              steps: context.steps,
              error: 'Timeout na confirmação do pagamento',
              fallback_stored: true
            };
          } else {
            // Pagamento recusado
            this.addStep(context, 'payment_confirmation', 'failed', `Pagamento recusado: ${pollingResult.error}`);
            
            return {
              success: false,
              steps: context.steps,
              error: pollingResult.error || 'Pagamento recusado'
            };
          }
        }

        this.addStep(context, 'payment_confirmation', 'completed', 'Pagamento confirmado com sucesso');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.addStep(context, 'payment_confirmation', 'failed', `Erro no polling: ${errorMessage}`);
        
        return {
          success: false,
          steps: context.steps,
          error: `Erro na confirmação: ${errorMessage}`
        };
      }

      // Etapa 5: Criar conta Supabase
      this.addStep(context, 'account_creation', 'processing', 'Criando conta de usuário...');
      
      try {
        const userId = await this.createSupabaseAccount(data);
        context.user_id = userId;
        this.addStep(context, 'account_creation', 'completed', `Conta criada: ${userId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.addStep(context, 'account_creation', 'failed', `Erro ao criar conta: ${errorMessage}`);
        
        // Armazenar no fallback system para completar depois
        await this.storePendingCompletion(context);
        
        return {
          success: false,
          steps: context.steps,
          error: `Erro ao criar conta: ${errorMessage}`,
          fallback_stored: true,
          requires_manual_intervention: true
        };
      }

      // Etapa 6: Criar perfil e assinatura
      this.addStep(context, 'profile_subscription', 'processing', 'Criando perfil e assinatura...');
      
      try {
        await this.createProfileAndSubscription(context);
        this.addStep(context, 'profile_subscription', 'completed', 'Perfil e assinatura criados com sucesso');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.addStep(context, 'profile_subscription', 'failed', `Erro ao criar perfil/assinatura: ${errorMessage}`);
        
        // Conta foi criada mas perfil/assinatura falharam - armazenar no fallback
        await this.storePendingCompletion(context);
        
        return {
          success: false,
          steps: context.steps,
          error: `Erro ao criar perfil/assinatura: ${errorMessage}`,
          fallback_stored: true,
          requires_manual_intervention: true
        };
      }

      // Sucesso completo
      this.addStep(context, 'completed', 'completed', 'Processo concluído com sucesso');

      return {
        success: true,
        user_id: context.user_id,
        payment_id: context.payment_id,
        asaas_customer_id: context.asaas_customer_id,
        asaas_subscription_id: context.asaas_subscription_id,
        steps: context.steps
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.addStep(context, 'error', 'failed', `Erro geral: ${errorMessage}`);
      
      console.error('Erro no Payment First Flow:', error);
      
      return {
        success: false,
        steps: context.steps,
        error: errorMessage
      };

    } finally {
      // Limpar contexto após processamento
      this.activeFlows.delete(flowId);
    }
  }

  /**
   * Obter status de um fluxo ativo
   */
  getFlowStatus(flowId: string): FlowContext | null {
    return this.activeFlows.get(flowId) || null;
  }

  /**
   * Listar fluxos ativos
   */
  getActiveFlows(): string[] {
    return Array.from(this.activeFlows.keys());
  }

  // Métodos privados auxiliares

  private generateFlowId(): string {
    return `flow_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private addStep(context: FlowContext, step: string, status: ProcessingStep['status'], message: string, error?: string): void {
    context.steps.push({
      step,
      status,
      message,
      timestamp: new Date().toISOString(),
      error
    });
  }

  private async createAsaasCustomer(data: RegistrationData): Promise<string> {
    console.log('Criando cliente Asaas via Edge Function para:', data.email);
    
    try {
      const supabase = getSupabaseClient();
      
      // Preparar dados do cliente para a Edge Function
      const customerData = {
        name: data.nome,
        cpfCnpj: data.cpf,
        email: data.email,
        phone: data.telefone,
        mobilePhone: data.telefone,
        address: data.endereco.logradouro,
        addressNumber: data.endereco.numero,
        complement: data.endereco.complemento,
        province: data.endereco.bairro,
        postalCode: data.endereco.cep,
        city: data.endereco.cidade,
        state: data.endereco.estado,
        country: 'Brasil',
        externalReference: `user_${Date.now()}`,
        notificationDisabled: false
      };

      // Chamar Edge Function para criar cliente
      const response = await supabase.functions.invoke('asaas-create-customer', {
        body: {
          user_id: `temp_${Date.now()}`, // ID temporário - será substituído quando conta for criada
          customer_data: customerData
        }
      });

      if (response.error) {
        throw new Error(`Erro na Edge Function: ${response.error.message}`);
      }

      if (!response.data?.success) {
        throw new Error(`Falha ao criar cliente: ${response.data?.error || 'Erro desconhecido'}`);
      }

      console.log('Cliente Asaas criado com sucesso:', response.data.customer_id);
      return response.data.customer_id;

    } catch (error) {
      console.error('Erro ao criar cliente Asaas:', error);
      throw new Error(`Falha na criação do cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private async processPayment(context: FlowContext): Promise<string> {
    console.log('Processando pagamento via Edge Function para cliente:', context.asaas_customer_id);
    
    try {
      const supabase = getSupabaseClient();
      
      // Buscar dados do plano para calcular valor
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('value, cycle')
        .eq('id', context.registration_data.plan_id)
        .single();

      if (planError || !plan) {
        throw new Error(`Plano não encontrado: ${context.registration_data.plan_id}`);
      }

      // Preparar dados do pagamento
      const paymentData = {
        billingType: context.registration_data.payment_method,
        value: plan.value,
        dueDate: new Date().toISOString().split('T')[0], // Hoje
        description: `Filiação COMADEMIG - ${context.registration_data.tipo_membro}`,
        externalReference: `filiacao_${Date.now()}`,
        // Dados do cartão se for pagamento com cartão
        ...(context.registration_data.payment_method === 'CREDIT_CARD' && context.registration_data.card_data && {
          creditCard: {
            holderName: context.registration_data.card_data.holderName,
            number: context.registration_data.card_data.number,
            expiryMonth: context.registration_data.card_data.expiryMonth,
            expiryYear: context.registration_data.card_data.expiryYear,
            ccv: context.registration_data.card_data.ccv
          },
          creditCardHolderInfo: {
            name: context.registration_data.nome,
            email: context.registration_data.email,
            cpfCnpj: context.registration_data.cpf,
            postalCode: context.registration_data.endereco.cep,
            addressNumber: context.registration_data.endereco.numero,
            addressComplement: context.registration_data.endereco.complemento,
            phone: context.registration_data.telefone,
            mobilePhone: context.registration_data.telefone
          }
        })
      };

      // Chamar Edge Function para criar pagamento
      const response = await supabase.functions.invoke('asaas-create-payment', {
        body: {
          customer_id: context.asaas_customer_id,
          service_type: 'filiacao',
          service_data: {
            type: 'filiacao',
            details: {
              tipo_membro: context.registration_data.tipo_membro,
              plan_id: context.registration_data.plan_id
            },
            affiliate_id: context.registration_data.affiliate_id
          },
          payment_data: paymentData
        }
      });

      if (response.error) {
        throw new Error(`Erro na Edge Function: ${response.error.message}`);
      }

      if (!response.data?.success) {
        throw new Error(`Falha ao criar pagamento: ${response.data?.error || 'Erro desconhecido'}`);
      }

      console.log('Pagamento criado com sucesso:', response.data.payment_id);
      return response.data.payment_id;

    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      throw new Error(`Falha no processamento do pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private async createSupabaseAccount(data: RegistrationData): Promise<string> {
    console.log('Criando conta Supabase para:', data.email);
    
    try {
      const supabase = getSupabaseClient();
      
      // Criar conta via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          nome: data.nome,
          cpf: data.cpf,
          telefone: data.telefone,
          tipo_membro: data.tipo_membro,
          registration_flow_version: 'payment_first_v1'
        }
      });

      if (authError) {
        throw new Error(`Erro ao criar conta: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Conta não foi criada - dados de usuário ausentes');
      }

      console.log('Conta Supabase criada com sucesso:', authData.user.id);
      return authData.user.id;

    } catch (error) {
      console.error('Erro ao criar conta Supabase:', error);
      throw new Error(`Falha na criação da conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private async createProfileAndSubscription(context: FlowContext): Promise<void> {
    console.log('Criando perfil e assinatura para usuário:', context.user_id);
    
    try {
      const supabase = getSupabaseClient();
      
      // 1. Criar perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: context.user_id,
          nome: context.registration_data.nome,
          email: context.registration_data.email,
          cpf: context.registration_data.cpf,
          telefone: context.registration_data.telefone,
          endereco: context.registration_data.endereco,
          tipo_membro: context.registration_data.tipo_membro,
          status: 'ativo', // Sempre ativo no novo fluxo
          asaas_customer_id: context.asaas_customer_id,
          payment_confirmed_at: new Date().toISOString(),
          registration_flow_version: 'payment_first_v1'
        });

      if (profileError) {
        throw new Error(`Erro ao criar perfil: ${profileError.message}`);
      }

      // 2. Buscar dados do plano
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', context.registration_data.plan_id)
        .single();

      if (planError || !plan) {
        throw new Error(`Plano não encontrado: ${context.registration_data.plan_id}`);
      }

      // 3. Criar assinatura do usuário
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: context.user_id,
          plan_id: context.registration_data.plan_id,
          status: 'active',
          start_date: new Date().toISOString(),
          next_billing_date: this.calculateNextBillingDate(plan.cycle),
          asaas_payment_id: context.payment_id,
          asaas_subscription_id: context.asaas_subscription_id,
          processing_context: {
            flow_version: 'payment_first_v1',
            payment_confirmed_at: new Date().toISOString(),
            affiliate_id: context.registration_data.affiliate_id
          }
        });

      if (subscriptionError) {
        throw new Error(`Erro ao criar assinatura: ${subscriptionError.message}`);
      }

      // 4. Se houver afiliado, registrar comissão
      if (context.registration_data.affiliate_id) {
        await this.registerAffiliateCommission(
          context.registration_data.affiliate_id,
          context.user_id!,
          context.payment_id!,
          plan.value
        );
      }

      console.log('Perfil e assinatura criados com sucesso');

    } catch (error) {
      console.error('Erro ao criar perfil e assinatura:', error);
      throw new Error(`Falha na criação do perfil/assinatura: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Calcula próxima data de cobrança baseada no ciclo do plano
   */
  private calculateNextBillingDate(cycle: string): string {
    const now = new Date();
    
    switch (cycle.toUpperCase()) {
      case 'MONTHLY':
        now.setMonth(now.getMonth() + 1);
        break;
      case 'SEMIANNUALLY':
        now.setMonth(now.getMonth() + 6);
        break;
      case 'YEARLY':
        now.setFullYear(now.getFullYear() + 1);
        break;
      default:
        // Padrão mensal
        now.setMonth(now.getMonth() + 1);
    }
    
    return now.toISOString();
  }

  /**
   * Registra comissão do afiliado
   */
  private async registerAffiliateCommission(
    affiliateId: string,
    userId: string,
    paymentId: string,
    planValue: number
  ): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // Buscar dados do afiliado
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('commission_percentage')
        .eq('id', affiliateId)
        .single();

      if (affiliateError || !affiliate) {
        console.warn('Afiliado não encontrado, pulando registro de comissão:', affiliateId);
        return;
      }

      const commissionAmount = (planValue * (affiliate.commission_percentage || 10)) / 100;

      // Registrar comissão
      const { error: commissionError } = await supabase
        .from('commissions')
        .insert({
          affiliate_id: affiliateId,
          user_id: userId,
          payment_id: paymentId,
          amount: commissionAmount,
          percentage: affiliate.commission_percentage || 10,
          status: 'pending',
          type: 'filiacao',
          created_at: new Date().toISOString()
        });

      if (commissionError) {
        console.error('Erro ao registrar comissão:', commissionError);
        // Não falha o processo principal por erro de comissão
      } else {
        console.log(`Comissão registrada: ${commissionAmount} para afiliado ${affiliateId}`);
      }

    } catch (error) {
      console.error('Erro ao processar comissão do afiliado:', error);
      // Não falha o processo principal
    }
  }

  private async storePendingSubscription(context: FlowContext): Promise<void> {
    await fallbackSystem.storePendingSubscription({
      payment_id: context.payment_id!,
      asaas_customer_id: context.asaas_customer_id!,
      user_data: {
        email: context.registration_data.email,
        password: context.registration_data.password,
        nome: context.registration_data.nome,
        cpf: context.registration_data.cpf,
        telefone: context.registration_data.telefone,
        endereco: context.registration_data.endereco,
        tipo_membro: context.registration_data.tipo_membro
      },
      subscription_data: {
        plan_id: context.registration_data.plan_id,
        affiliate_id: context.registration_data.affiliate_id
      },
      payment_data: {
        amount: 0, // TODO: Obter valor real do plano
        payment_method: context.registration_data.payment_method
      },
      attempts: 0,
      status: 'pending'
    });
  }

  private async storePendingCompletion(context: FlowContext): Promise<void> {
    await fallbackSystem.storePendingCompletion({
      payment_id: context.payment_id!,
      asaas_customer_id: context.asaas_customer_id!,
      asaas_subscription_id: context.asaas_subscription_id || '',
      user_data: {
        email: context.registration_data.email,
        password: context.registration_data.password,
        nome: context.registration_data.nome,
        cpf: context.registration_data.cpf,
        telefone: context.registration_data.telefone,
        endereco: context.registration_data.endereco,
        tipo_membro: context.registration_data.tipo_membro
      },
      attempts: 0,
      status: 'pending'
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Métodos de validação

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidCPF(cpf: string): boolean {
    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cleanCPF.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
    
    return true;
  }

  private isValidPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  }

  private isValidCEP(cep: string): boolean {
    const cleanCEP = cep.replace(/\D/g, '');
    return cleanCEP.length === 8;
  }

  private isValidCardNumber(number: string): boolean {
    const cleanNumber = number.replace(/\D/g, '');
    return cleanNumber.length >= 13 && cleanNumber.length <= 19;
  }

  private isValidMonth(month: string): boolean {
    const monthNum = parseInt(month);
    return monthNum >= 1 && monthNum <= 12;
  }

  private isValidYear(year: string): boolean {
    const yearNum = parseInt(year);
    const currentYear = new Date().getFullYear();
    return yearNum >= currentYear && yearNum <= currentYear + 20;
  }

  private isValidCCV(ccv: string): boolean {
    const cleanCCV = ccv.replace(/\D/g, '');
    return cleanCCV.length >= 3 && cleanCCV.length <= 4;
  }
}

// Exportar instância singleton
export const paymentFirstFlowService = PaymentFirstFlowService.getInstance();