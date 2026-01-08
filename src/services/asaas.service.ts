/**
 * SERVIÇO ASAAS - INTEGRAÇÃO REAL COM API
 * Processa pagamentos e split de comissões
 */

interface AsaasCustomer {
  name: string;
  email: string;
  phone: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
}

interface AsaasPayment {
  customer: string; // ID do customer no Asaas
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  discount?: {
    value: number;
    dueDateLimitDays: number;
  };
  interest?: {
    value: number;
  };
  fine?: {
    value: number;
  };
  postalService?: boolean;
}

interface AsaasSplit {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
  totalValue?: number;
}

export class AsaasService {
  private apiKey: string;
  private baseUrl: string;
  
  constructor() {
    // Buscar API key do ambiente (frontend usa VITE_, backend usa direto)
    this.apiKey = import.meta.env.VITE_ASAAS_API_KEY || process.env.ASAAS_API_KEY || '';
    this.baseUrl = 'https://api.asaas.com/v3';
    
    if (!this.apiKey) {
      console.warn('⚠️ ASAAS_API_KEY não encontrada - usando modo simulação');
    } else {
      console.log('🔑 Asaas configurado com API key:', this.apiKey.substring(0, 20) + '...');
    }
  }

  /**
   * Headers padrão para requisições
   */
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'access_token': this.apiKey
    };
  }

  /**
   * Cria ou atualiza customer no Asaas
   */
  async createOrUpdateCustomer(customerData: AsaasCustomer): Promise<string> {
    if (!this.apiKey) {
      console.log('🔄 Modo simulação - customer criado:', customerData.email);
      return `cus_simulated_${Date.now()}`;
    }

    try {
      // Primeiro, tentar buscar customer existente pelo email
      const searchResponse = await fetch(
        `${this.baseUrl}/customers?email=${encodeURIComponent(customerData.email)}`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        
        if (searchResult.data && searchResult.data.length > 0) {
          const existingCustomer = searchResult.data[0];
          console.log('👤 Customer existente encontrado:', existingCustomer.id);
          return existingCustomer.id;
        }
      }

      // Se não encontrou, criar novo customer
      const createResponse = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(customerData)
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(`Erro ao criar customer: ${error.errors?.[0]?.description || createResponse.statusText}`);
      }

      const customer = await createResponse.json();
      console.log('👤 Novo customer criado:', customer.id);
      return customer.id;

    } catch (error) {
      console.error('❌ Erro no Asaas customer:', error);
      throw error;
    }
  }

  /**
   * Cria cobrança no Asaas COM split integrado na criação
   * IMPORTANTE: Split deve ser incluído na criação, não separadamente
   */
  async createPayment(paymentData: AsaasPayment & { split?: AsaasSplit[] }): Promise<any> {
    if (!this.apiKey) {
      console.log('🔄 Modo simulação - cobrança criada:', paymentData);
      
      // Gerar URL de checkout válida para simulação
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://slimquality.com.br';
      const simulatedId = `pay_simulated_${Date.now()}`;
      
      return {
        id: simulatedId,
        invoiceUrl: `${baseUrl}/checkout-simulado?payment=${simulatedId}&amount=${paymentData.value}&type=${paymentData.billingType}`,
        bankSlipUrl: `${baseUrl}/boleto-simulado?payment=${simulatedId}`,
        pixQrCode: `00020126580014br.gov.bcb.pix0136${simulatedId}520400005303986540${paymentData.value.toFixed(2)}5802BR5925SLIM QUALITY SIMULACAO6009SAO PAULO62070503***6304`,
        pixCopyPaste: `00020126580014br.gov.bcb.pix0136${simulatedId}520400005303986540${paymentData.value.toFixed(2)}5802BR5925SLIM QUALITY SIMULACAO6009SAO PAULO62070503***6304`,
        status: 'PENDING',
        value: paymentData.value,
        netValue: paymentData.value,
        billingType: paymentData.billingType,
        split: paymentData.split // Incluir split na resposta simulada
      };
    }

    try {
      // Incluir split diretamente no payload de criação do pagamento
      const payload = {
        ...paymentData,
        // Split vai junto na criação - NÃO separadamente!
        split: paymentData.split
      };

      console.log('💳 Criando pagamento COM split integrado:', {
        value: paymentData.value,
        billingType: paymentData.billingType,
        splitCount: paymentData.split?.length || 0
      });

      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Erro ao criar cobrança: ${error.errors?.[0]?.description || response.statusText}`);
      }

      const payment = await response.json();
      console.log('💳 Cobrança criada COM split:', payment.id);
      return payment;

    } catch (error) {
      console.error('❌ Erro ao criar cobrança:', error);
      throw error;
    }
  }

  /**
   * Cria split de pagamento
   */
  async createSplit(paymentId: string, splits: AsaasSplit[]): Promise<any> {
    if (!this.apiKey) {
      console.log('🔄 Modo simulação - split criado:', { paymentId, splits });
      return {
        id: `split_simulated_${Date.now()}`,
        status: 'PENDING',
        splits: splits.map((split, index) => ({
          id: `split_item_${index}`,
          walletId: split.walletId,
          value: split.fixedValue || split.totalValue || 0,
          status: 'PENDING'
        }))
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}/split`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ splits })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Erro ao criar split: ${error.errors?.[0]?.description || response.statusText}`);
      }

      const split = await response.json();
      console.log('💰 Split criado:', split.id);
      return split;

    } catch (error) {
      console.error('❌ Erro ao criar split:', error);
      throw error;
    }
  }

  /**
   * Busca informações de um pagamento
   */
  async getPayment(paymentId: string): Promise<any> {
    if (!this.apiKey) {
      console.log('🔄 Modo simulação - buscando pagamento:', paymentId);
      return {
        id: paymentId,
        status: 'PENDING',
        value: 100.00,
        billingType: 'PIX'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar pagamento: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Erro ao buscar pagamento:', error);
      throw error;
    }
  }

  /**
   * Valida webhook do Asaas
   */
  validateWebhook(payload: any, signature: string): boolean {
    if (!this.apiKey) {
      console.log('🔄 Modo simulação - webhook válido');
      return true;
    }

    // TODO: Implementar validação real da assinatura
    // Por enquanto, aceitar todos os webhooks em desenvolvimento
    return true;
  }

  /**
   * Processa checkout completo com Asaas
   * IMPORTANTE: Split é incluído NA criação do pagamento, não separadamente
   */
  async processCheckout(orderData: {
    customer: AsaasCustomer;
    amount: number;
    description: string;
    externalReference: string;
    billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
    installments?: number;
    splits?: AsaasSplit[];
  }) {
    try {
      console.log('🛒 Processando checkout Asaas:', orderData.externalReference);

      // 1. Criar/buscar customer
      const customerId = await this.createOrUpdateCustomer(orderData.customer);

      // 2. Criar cobrança COM split integrado (não separadamente!)
      const paymentData: AsaasPayment & { split?: AsaasSplit[] } = {
        customer: customerId,
        billingType: orderData.billingType,
        value: orderData.amount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias
        description: orderData.description,
        externalReference: orderData.externalReference,
        // SPLIT INCLUÍDO NA CRIAÇÃO - NÃO SEPARADAMENTE!
        split: orderData.splits
      };

      // Adicionar parcelamento se for cartão de crédito
      if (orderData.billingType === 'CREDIT_CARD' && orderData.installments && orderData.installments > 1) {
        paymentData.installmentCount = orderData.installments;
        paymentData.installmentValue = orderData.amount / orderData.installments;
      }

      // Log detalhado do split para auditoria
      if (orderData.splits && orderData.splits.length > 0) {
        const totalSplitPercentage = orderData.splits.reduce((sum, s) => sum + (s.percentualValue || 0), 0);
        console.log('💰 Split configurado:', {
          totalPercentage: `${totalSplitPercentage}%`,
          recipients: orderData.splits.length,
          splits: orderData.splits.map(s => ({
            wallet: s.walletId.substring(0, 10) + '...',
            percentage: s.percentualValue
          }))
        });
      }

      // Criar pagamento COM split integrado
      const payment = await this.createPayment(paymentData);

      return {
        success: true,
        paymentId: payment.id,
        checkoutUrl: payment.invoiceUrl,
        pixQrCode: payment.pixQrCode,
        pixCopyPaste: payment.pixCopyPaste,
        boletoUrl: payment.bankSlipUrl,
        splitIncluded: !!(orderData.splits && orderData.splits.length > 0),
        status: payment.status
      };

    } catch (error) {
      console.error('❌ Erro no checkout Asaas:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

// Instância singleton
export const asaasService = new AsaasService();