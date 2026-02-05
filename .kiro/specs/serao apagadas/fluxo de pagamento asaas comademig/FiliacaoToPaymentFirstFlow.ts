/**
 * Adapter: FiliacaoToPaymentFirstFlow
 * 
 * Mapeia dados do formulário de filiação atual para o formato
 * esperado pelo PaymentFirstFlowService
 * 
 * Requirements: 1.1, 3.1
 */

import type { FiliacaoPaymentData } from '@/hooks/useFiliacaoPayment';
import type { UnifiedMemberType } from '@/hooks/useMemberTypeWithPlan';
import { MemberTypeMapper } from '@/utils/memberTypeMapping';
import type { RegistrationData } from '@/lib/services/PaymentFirstFlowService';

export interface AdapterContext {
  selectedMemberType: UnifiedMemberType;
  affiliateInfo?: {
    referralCode: string;
    affiliateInfo: {
      id: string;
    };
  };
  isUserLoggedIn: boolean;
}

export interface AdapterResult {
  success: boolean;
  data?: RegistrationData;
  errors?: string[];
}

export class FiliacaoToPaymentFirstFlow {
  /**
   * Converte dados do formulário de filiação para PaymentFirstFlow
   */
  static adapt(
    filiacaoData: FiliacaoPaymentData, 
    context: AdapterContext
  ): AdapterResult {
    const errors: string[] = [];

    try {
      // 1. Validar dados obrigatórios
      if (!filiacaoData.nome_completo?.trim()) {
        errors.push('Nome completo é obrigatório');
      }

      if (!filiacaoData.email?.trim()) {
        errors.push('Email é obrigatório');
      }

      if (!filiacaoData.cpf?.trim()) {
        errors.push('CPF é obrigatório');
      }

      if (!filiacaoData.telefone?.trim()) {
        errors.push('Telefone é obrigatório');
      }

      // Validar senha apenas se usuário não estiver logado
      if (!context.isUserLoggedIn && !filiacaoData.password?.trim()) {
        errors.push('Senha é obrigatória para criar nova conta');
      }

      // Validar endereço
      if (!filiacaoData.cep?.trim()) {
        errors.push('CEP é obrigatório');
      }

      if (!filiacaoData.endereco?.trim()) {
        errors.push('Endereço é obrigatório');
      }

      if (!filiacaoData.bairro?.trim()) {
        errors.push('Bairro é obrigatório');
      }

      if (!filiacaoData.cidade?.trim()) {
        errors.push('Cidade é obrigatória');
      }

      if (!filiacaoData.estado?.trim()) {
        errors.push('Estado é obrigatório');
      }

      // Validar plano
      if (!context.selectedMemberType.plan_id) {
        errors.push('Tipo de membro selecionado não possui plano associado');
      }

      // Validar dados do cartão (obrigatório para Payment First Flow)
      if (!filiacaoData.creditCard) {
        errors.push('Dados do cartão são obrigatórios');
      } else {
        if (!filiacaoData.creditCard.holderName?.trim()) {
          errors.push('Nome do portador do cartão é obrigatório');
        }

        if (!filiacaoData.creditCard.number?.trim()) {
          errors.push('Número do cartão é obrigatório');
        }

        if (!filiacaoData.creditCard.expiryMonth?.trim()) {
          errors.push('Mês de expiração é obrigatório');
        }

        if (!filiacaoData.creditCard.expiryYear?.trim()) {
          errors.push('Ano de expiração é obrigatório');
        }

        if (!filiacaoData.creditCard.ccv?.trim()) {
          errors.push('CCV é obrigatório');
        }
      }

      // Se há erros de validação, retornar
      if (errors.length > 0) {
        return {
          success: false,
          errors
        };
      }

      // 2. Mapear tipo de membro usando sistema flexível
      const tipoMembro = MemberTypeMapper.mapToPaymentFirstFlow(context.selectedMemberType);

      // 3. Processar endereço e número
      const { endereco, numero } = this.processAddress(
        filiacaoData.endereco, 
        filiacaoData.numero
      );

      // 4. Construir dados adaptados
      const adaptedData: RegistrationData = {
        // Dados pessoais
        nome: filiacaoData.nome_completo.trim(),
        email: filiacaoData.email.trim().toLowerCase(),
        password: filiacaoData.password?.trim() || '', // Será validado no PaymentFirstFlow se necessário
        cpf: this.cleanCPF(filiacaoData.cpf),
        telefone: this.cleanPhone(filiacaoData.telefone),
        
        // Endereço
        endereco: {
          cep: this.cleanCEP(filiacaoData.cep),
          logradouro: endereco,
          numero: numero,
          complemento: filiacaoData.complemento?.trim() || undefined,
          bairro: filiacaoData.bairro.trim(),
          cidade: filiacaoData.cidade.trim(),
          estado: filiacaoData.estado.trim().toUpperCase()
        },
        
        // Dados profissionais
        tipo_membro: tipoMembro,
        
        // Dados de pagamento
        plan_id: context.selectedMemberType.plan_id!,
        payment_method: 'CREDIT_CARD', // Payment First Flow só suporta cartão
        card_data: filiacaoData.creditCard ? {
          holderName: filiacaoData.creditCard.holderName.trim(),
          number: filiacaoData.creditCard.number.replace(/\D/g, ''),
          expiryMonth: filiacaoData.creditCard.expiryMonth.padStart(2, '0'),
          expiryYear: filiacaoData.creditCard.expiryYear,
          ccv: filiacaoData.creditCard.ccv
        } : undefined,
        
        // Dados de afiliado (opcional)
        affiliate_id: context.affiliateInfo?.affiliateInfo?.id
      };

      return {
        success: true,
        data: adaptedData
      };

    } catch (error) {
      console.error('Erro no adapter FiliacaoToPaymentFirstFlow:', error);
      return {
        success: false,
        errors: ['Erro interno no processamento dos dados']
      };
    }
  }

  /**
   * Processa endereço e número, extraindo número do endereço se necessário
   */
  private static processAddress(endereco: string, numero?: string): { endereco: string; numero: string } {
    let cleanAddress = endereco.trim();
    let addressNumber = numero?.trim() || '';

    // Se número está vazio mas endereço tem número no final, extrair
    if (!addressNumber && cleanAddress) {
      const addressMatch = cleanAddress.match(/^(.+?),?\s*(\d+)\s*$/);
      if (addressMatch) {
        cleanAddress = addressMatch[1].trim(); // Rua sem número
        addressNumber = addressMatch[2]; // Número extraído
        console.log('🔧 Número extraído do endereço:', addressNumber);
      }
    }

    // Fallback final se ainda estiver vazio
    if (!addressNumber) {
      addressNumber = 'S/N';
    }

    return {
      endereco: cleanAddress,
      numero: addressNumber
    };
  }

  /**
   * Limpa e valida CPF
   */
  private static cleanCPF(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  /**
   * Limpa e valida telefone
   */
  private static cleanPhone(telefone: string): string {
    return telefone.replace(/\D/g, '');
  }

  /**
   * Limpa e valida CEP
   */
  private static cleanCEP(cep: string): string {
    return cep.replace(/\D/g, '');
  }

  /**
   * Valida se os dados adaptados estão corretos
   */
  static validate(data: RegistrationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validações básicas
    if (!data.nome || data.nome.length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Email inválido');
    }

    if (!data.cpf || data.cpf.length !== 11) {
      errors.push('CPF deve ter 11 dígitos');
    }

    if (!data.telefone || data.telefone.length < 10) {
      errors.push('Telefone deve ter pelo menos 10 dígitos');
    }

    // Validar endereço
    if (!data.endereco.cep || data.endereco.cep.length !== 8) {
      errors.push('CEP deve ter 8 dígitos');
    }

    if (!data.endereco.logradouro || data.endereco.logradouro.length < 5) {
      errors.push('Logradouro deve ter pelo menos 5 caracteres');
    }

    if (!data.endereco.numero) {
      errors.push('Número do endereço é obrigatório');
    }

    if (!data.endereco.bairro || data.endereco.bairro.length < 2) {
      errors.push('Bairro deve ter pelo menos 2 caracteres');
    }

    if (!data.endereco.cidade || data.endereco.cidade.length < 2) {
      errors.push('Cidade deve ter pelo menos 2 caracteres');
    }

    if (!data.endereco.estado || data.endereco.estado.length !== 2) {
      errors.push('Estado deve ter 2 caracteres (UF)');
    }

    // Validar tipo de membro
    const validTypes = ['bispo', 'pastor', 'diacono', 'membro'];
    if (!validTypes.includes(data.tipo_membro)) {
      errors.push('Tipo de membro inválido');
    }

    // Validar dados do cartão
    if (data.payment_method === 'CREDIT_CARD' && data.card_data) {
      if (!data.card_data.holderName || data.card_data.holderName.length < 2) {
        errors.push('Nome do portador inválido');
      }

      if (!data.card_data.number || data.card_data.number.length < 13) {
        errors.push('Número do cartão inválido');
      }

      if (!data.card_data.expiryMonth || !this.isValidMonth(data.card_data.expiryMonth)) {
        errors.push('Mês de expiração inválido');
      }

      if (!data.card_data.expiryYear || !this.isValidYear(data.card_data.expiryYear)) {
        errors.push('Ano de expiração inválido');
      }

      if (!data.card_data.ccv || data.card_data.ccv.length < 3) {
        errors.push('CCV inválido');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Métodos auxiliares de validação
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidMonth(month: string): boolean {
    const monthNum = parseInt(month);
    return monthNum >= 1 && monthNum <= 12;
  }

  private static isValidYear(year: string): boolean {
    const yearNum = parseInt(year);
    const currentYear = new Date().getFullYear();
    return yearNum >= currentYear && yearNum <= currentYear + 20;
  }
}

// Tipos auxiliares para uso em hooks
export type { RegistrationData };

/*
EXEMPLO DE USO:

import { FiliacaoToPaymentFirstFlow } from '@/lib/adapters/FiliacaoToPaymentFirstFlow';

const filiacaoData: FiliacaoPaymentData = {
  nome_completo: 'João Silva',
  email: 'joao@email.com',
  password: 'senha123',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  cep: '01234-567',
  endereco: 'Rua das Flores, 123',
  numero: '123',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  payment_method: 'credit_card',
  creditCard: {
    holderName: 'João Silva',
    number: '4111111111111111',
    expiryMonth: '12',
    expiryYear: '2025',
    ccv: '123'
  },
  creditCardHolderInfo: {
    name: 'João Silva',
    email: 'joao@email.com',
    cpfCnpj: '12345678900',
    postalCode: '01234567',
    addressNumber: '123',
    phone: '11999999999'
  }
};

const context: AdapterContext = {
  selectedMemberType: {
    id: 'uuid',
    name: 'Pastor',
    plan_id: 'plan_uuid',
    plan_value: 50.00
  },
  affiliateInfo: {
    referralCode: 'ABC123',
    affiliateInfo: { id: 'affiliate_uuid' }
  },
  isUserLoggedIn: false
};

const result = FiliacaoToPaymentFirstFlow.adapt(filiacaoData, context);

if (result.success) {
  // Usar result.data com PaymentFirstFlowService
  const paymentResult = await paymentFirstFlowService.processRegistration(result.data);
} else {
  // Tratar erros: result.errors
  console.error('Erros de adaptação:', result.errors);
}
*/