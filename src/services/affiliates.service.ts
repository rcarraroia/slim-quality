/**
 * Serviço de Afiliados
 * 
 * Gerencia operações relacionadas a afiliados, incluindo registro,
 * consulta de dados, e gerenciamento de comissões.
 * 
 * Feature: etapa-1-tipos-afiliados
 * Phase: 4 - Frontend Update
 * Task: 4.3
 */

// ============================================
// TIPOS
// ============================================

export interface RegisterAffiliateRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
  affiliate_type: 'individual' | 'logista';
  document: string;
  referral_code?: string;
}

export interface RegisterAffiliateResponse {
  success: boolean;
  data?: {
    id: string;
    name: string;
    email: string;
    affiliate_type: 'individual' | 'logista';
    financial_status: 'financeiro_pendente' | 'ativo';
    referral_code: string;
    status: string;
  };
  error?: string;
  field?: string;
}

// ============================================
// FUNÇÕES
// ============================================

/**
 * Registra um novo afiliado no sistema
 * 
 * @param data - Dados do afiliado a ser registrado
 * @returns Promise com resultado do registro
 */
export async function registerAffiliate(
  data: RegisterAffiliateRequest
): Promise<RegisterAffiliateResponse> {
  try {
    const response = await fetch('/api/affiliates?action=register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    // Tratar erros da API
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Erro ao registrar afiliado',
        field: result.field,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error('Erro ao registrar afiliado:', error);
    return {
      success: false,
      error: 'Erro de conexão. Tente novamente.',
    };
  }
}

/**
 * Busca dados de um afiliado pelo ID
 * 
 * @param affiliateId - ID do afiliado
 * @param token - Token de autenticação
 * @returns Promise com dados do afiliado
 */
export async function getAffiliateById(
  affiliateId: string,
  token: string
): Promise<any> {
  try {
    const response = await fetch(`/api/affiliates/${affiliateId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar afiliado');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar afiliado:', error);
    throw error;
  }
}

/**
 * Atualiza dados de um afiliado
 * 
 * @param affiliateId - ID do afiliado
 * @param data - Dados a serem atualizados
 * @param token - Token de autenticação
 * @returns Promise com resultado da atualização
 */
export async function updateAffiliate(
  affiliateId: string,
  data: Partial<RegisterAffiliateRequest>,
  token: string
): Promise<any> {
  try {
    const response = await fetch(`/api/affiliates/${affiliateId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar afiliado');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao atualizar afiliado:', error);
    throw error;
  }
}
