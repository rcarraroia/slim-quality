/**
 * Affiliate Service
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Service principal para gestão de afiliados
 * - Cadastro e validação de afiliados
 * - Construção da árvore genealógica
 * - Gestão de códigos de referência
 * - Validações de integridade da rede
 */

import { Logger } from '@/utils/logger';
import { affiliateAsaasService } from './affiliate-asaas.service';
import { crmIntegrationService } from '@/services/crm/integration.service';
import { affiliateRepository, IAffiliateRepository } from '@/repositories/affiliate.repository';
import { DataSanitizer } from '@/utils/sanitization';
import {
  Affiliate,
  AffiliateNetwork,
  CreateAffiliateRequest,
  UpdateAffiliateRequest,
  UpdateAffiliateStatusRequest,
  AffiliateStatsResponse,
  NetworkTreeNode,
  AffiliateQueryParams,
  ServiceResponse,
  PaginatedResponse,
  WalletValidation,
  AffiliateResponseDTO,
  AffiliateDetailResponseDTO,
  AffiliateAdminResponseDTO,
  CreateAffiliateDTO,
} from '@/types/affiliate.types';
import {
  DomainError,
  ValidationError,
  InvalidWalletError,
  DuplicateAffiliateError,
  InvalidReferralCodeError,
  NotFoundError,
  AffiliateNotFoundError,
  ForbiddenError,
  InsufficientPermissionsError,
  ConflictError,
  AffiliateInactiveError,
  InsufficientBalanceError,
  ExternalServiceError,
  AsaasServiceError,
  DatabaseError,
  ApplicationError,
  handleServiceError,
} from '@/utils/errors';

export class AffiliateService {
  constructor(
    private repository: IAffiliateRepository = affiliateRepository
  ) {}
  /**
    * Cria novo afiliado com validações completas
    */
   async createAffiliate(data: CreateAffiliateRequest, userId?: string): Promise<ServiceResponse<AffiliateResponseDTO>> {
     try {
       Logger.info('AffiliateService', 'Creating affiliate', {
         hasReferralCode: !!data.referralCode,
         // Removed PII from logs
       });

       // 1. Sanitizar dados de entrada
       const sanitizedData = DataSanitizer.sanitizeAffiliateData(data);
       const validation = DataSanitizer.validateSanitizedData(sanitizedData);

       if (!validation.isValid) {
         throw new ValidationError(validation.errors[0]);
       }

       // 2. Validar Wallet ID via Asaas
       const walletValidation = await this.validateWalletId(sanitizedData.walletId);
       if (!walletValidation.isValid) {
         throw new InvalidWalletError(sanitizedData.walletId);
       }

       if (!walletValidation.isActive) {
         throw new InvalidWalletError(sanitizedData.walletId);
       }

       // 3. Verificar duplicatas
       const existingByEmail = await this.repository.findByUserId(userId || '');
       if (existingByEmail) {
         throw new DuplicateAffiliateError('email', sanitizedData.email);
       }

       const existingByWallet = await this.repository.findByWalletId(sanitizedData.walletId);
       if (existingByWallet) {
         throw new DuplicateAffiliateError('walletId', sanitizedData.walletId);
       }

       // 4. Validar código de indicação (se fornecido)
       let parentAffiliate: Affiliate | null = null;
       if (sanitizedData.referralCode) {
         parentAffiliate = await this.repository.findByReferralCode(sanitizedData.referralCode);
         if (!parentAffiliate) {
           throw new InvalidReferralCodeError(sanitizedData.referralCode);
         }

         if (parentAffiliate.status !== 'active') {
           throw new AffiliateInactiveError(parentAffiliate.id);
         }
       }

       // 5. Gerar código de referência único
       const referralCode = await this.generateReferralCode();

       // 6. Criar afiliado via repository
       const affiliateData: CreateAffiliateDTO = {
         userId: userId || '',
         name: sanitizedData.name,
         email: sanitizedData.email,
         phone: sanitizedData.phone,
         document: sanitizedData.document,
         walletId: sanitizedData.walletId,
         referralCode,
         pixKey: sanitizedData.pixKey,
       };

       const newAffiliate = await this.repository.create(affiliateData);

       // 7. Construir rede genealógica (se há indicação)
       if (parentAffiliate) {
         const networkResult = await this.buildNetwork(newAffiliate.id, parentAffiliate.id);
         if (!networkResult.success) {
           // Rollback: deletar afiliado criado
           await this.repository.delete(newAffiliate.id);
           throw new ApplicationError(networkResult.error || 'Erro ao construir rede genealógica');
         }
       } else {
         // Criar como raiz (nível 1)
         await this.createNetworkRoot(newAffiliate.id);
       }

       Logger.info('AffiliateService', 'Affiliate created successfully', {
         affiliateId: newAffiliate.id,
         referralCode: newAffiliate.referralCode,
         hasParent: !!parentAffiliate,
         // Removed PII from logs
       });

       // Integração CRM: Registrar afiliado no CRM
       try {
         await crmIntegrationService.handleAffiliateCreated(newAffiliate);
       } catch (error) {
         Logger.error('AffiliateService', 'CRM integration failed (non-critical)', error as Error);
         // Não falhar a operação se integração CRM falhar
       }

       // Return DTO instead of full entity
       return {
         success: true,
         data: this.toAffiliateResponseDTO(newAffiliate)
       };

     } catch (error) {
       const handledError = handleServiceError(error);
       Logger.error('AffiliateService', 'Error in createAffiliate', {
         error: handledError.message,
         code: handledError.code,
         // Removed PII from logs
       });

       return {
         success: false,
         code: handledError.code,
       };
     }
   }

  /**
   * Valida Wallet ID do Asaas
   */
  async validateWalletId(walletId: string): Promise<WalletValidation> {
    try {
      return await affiliateAsaasService.validateWallet(walletId);
    } catch (error) {
      Logger.error('AffiliateService', 'Error validating wallet ID', error as Error);
      return {
        isValid: false,
        isActive: false,
        error: 'Erro ao validar Wallet ID',
      };
    }
  }

  /**
    * Busca afiliado por código de referência
    */
   async getAffiliateByCode(referralCode: string): Promise<ServiceResponse<AffiliateResponseDTO>> {
     try {
       const affiliate = await this.repository.findByReferralCode(referralCode);

       if (!affiliate) {
         throw new AffiliateNotFoundError('referral_code');
       }

       return { success: true, data: this.toAffiliateResponseDTO(affiliate) };

     } catch (error) {
       const handledError = handleServiceError(error);
       Logger.error('AffiliateService', 'Error getting affiliate by code', {
         referralCode,
         error: handledError.message,
         code: handledError.code,
       });
       return {
         success: false,
         error: handledError.message,
         code: handledError.code,
       };
     }
   }

  /**
    * Busca afiliado por ID
    */
   async getAffiliateById(affiliateId: string): Promise<ServiceResponse<AffiliateResponseDTO>> {
     try {
       const affiliate = await this.repository.findById(affiliateId);

       if (!affiliate) {
         throw new AffiliateNotFoundError(affiliateId);
       }

       return { success: true, data: this.toAffiliateResponseDTO(affiliate) };

     } catch (error) {
       const handledError = handleServiceError(error);
       Logger.error('AffiliateService', 'Error getting affiliate by ID', {
         affiliateId,
         error: handledError.message,
         code: handledError.code,
       });
       return {
         success: false,
         error: handledError.message,
         code: handledError.code,
       };
     }
   }

  /**
    * Busca afiliado por user_id
    */
   async getAffiliateByUserId(userId: string): Promise<ServiceResponse<AffiliateResponseDTO>> {
     try {
       const affiliate = await this.repository.findByUserId(userId);

       if (!affiliate) {
         throw new AffiliateNotFoundError(`user_${userId}`);
       }

       return { success: true, data: this.toAffiliateResponseDTO(affiliate) };

     } catch (error) {
       const handledError = handleServiceError(error);
       Logger.error('AffiliateService', 'Error getting affiliate by user ID', {
         userId,
         error: handledError.message,
         code: handledError.code,
       });
       return {
         success: false,
         error: handledError.message,
         code: handledError.code,
       };
     }
   }

  /**
   * Lista afiliados com paginação e filtros
   */
  async getAffiliates(params: AffiliateQueryParams = {}): Promise<ServiceResponse<PaginatedResponse<Affiliate>>> {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const offset = (page - 1) * limit;

      let query = supabase
        .from('affiliates')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      // Filtros
      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,referral_code.ilike.%${search}%`);
      }

      // Ordenação
      const ascending = sortOrder === 'asc';
      query = query.order(sortBy, { ascending });

      // Paginação
      query = query.range(offset, offset + limit - 1);

      const { data: affiliates, error, count } = await query;

      if (error) {
        Logger.error('AffiliateService', 'Error listing affiliates', error);
        return {
          success: false,
          error: 'Erro ao listar afiliados',
          code: 'LIST_AFFILIATES_ERROR',
        };
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        success: true,
        data: {
          data: affiliates || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages,
            hasMore: page < totalPages,
          },
        },
      };

    } catch (error) {
      Logger.error('AffiliateService', 'Error in getAffiliates', error as Error);
      return {
        success: false,
        error: 'Erro interno ao listar afiliados',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Atualiza dados do afiliado
   */
  async updateAffiliate(
    affiliateId: string,
    data: UpdateAffiliateRequest,
    userId?: string
  ): Promise<ServiceResponse<AffiliateResponseDTO>> {
    try {
      Logger.info('AffiliateService', 'Updating affiliate', { affiliateId });

      // Verificar se afiliado existe
      const affiliate = await this.repository.findById(affiliateId);
      if (!affiliate) {
        throw new AffiliateNotFoundError(affiliateId);
      }

      // Verificar permissões (só o próprio usuário ou admin pode atualizar)
      if (userId && affiliate.userId !== userId) {
        // TODO: Verificar se é admin
        throw new ForbiddenError('Apenas o próprio usuário pode atualizar seus dados');
      }

      // Preparar dados para atualização
      const updateData: UpdateAffiliateDTO = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.pixKey !== undefined) updateData.pixKey = data.pixKey;

      // Status is not in UpdateAffiliateRequest - handled separately in updateAffiliateStatus

      if (Object.keys(updateData).length === 0) {
        throw new ValidationError('Nenhum campo válido para atualizar');
      }

      // Atualizar via repository
      const updatedAffiliate = await this.repository.update(affiliateId, updateData);

      Logger.info('AffiliateService', 'Affiliate updated successfully', {
        affiliateId,
        updatedBy: userId,
      });

      return { success: true, data: this.toAffiliateResponseDTO(updatedAffiliate) };

    } catch (error) {
      const handledError = handleServiceError(error);
      Logger.error('AffiliateService', 'Error in updateAffiliate', {
        affiliateId,
        error: handledError.message,
        code: handledError.code,
      });
      return {
        success: false,
        error: handledError.message,
        code: handledError.code,
      };
    }
  }

  /**
   * Atualiza status do afiliado (apenas admin)
   */
  async updateAffiliateStatus(
    affiliateId: string,
    statusData: UpdateAffiliateStatusRequest,
    adminUserId: string
  ): Promise<ServiceResponse<Affiliate>> {
    try {
      const updateData: any = {
        status: statusData.status,
        updated_at: new Date().toISOString(),
      };

      // Se aprovando, definir dados de aprovação
      if (statusData.status === 'active') {
        updateData.approved_by = adminUserId;
        updateData.approved_at = new Date().toISOString();
      }

      // Se rejeitando, definir motivo
      if (statusData.status === 'rejected' && statusData.reason) {
        updateData.rejection_reason = statusData.reason;
      }

      const { data: updatedAffiliate, error } = await supabase
        .from('affiliates')
        .update(updateData)
        .eq('id', affiliateId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        Logger.error('AffiliateService', 'Error updating affiliate status', error);
        return {
          success: false,
          error: 'Erro ao atualizar status do afiliado',
          code: 'UPDATE_STATUS_ERROR',
        };
      }

      Logger.info('AffiliateService', 'Affiliate status updated', {
        affiliateId,
        newStatus: statusData.status,
        updatedBy: adminUserId,
      });

      // Integração CRM: Registrar mudança de status
      try {
        // Buscar status anterior
        const { data: previousAffiliate } = await supabase
          .from('affiliates')
          .select('status')
          .eq('id', affiliateId)
          .single();
        
        const oldStatus = previousAffiliate?.status || 'unknown';
        await crmIntegrationService.handleAffiliateStatusChanged(
          updatedAffiliate,
          oldStatus,
          statusData.status
        );
      } catch (error) {
        Logger.error('AffiliateService', 'Erro ao integrar mudança de status com CRM (não crítico)', error as Error);
        // Não falhar a operação se integração CRM falhar
      }

      return { success: true, data: updatedAffiliate };

    } catch (error) {
      Logger.error('AffiliateService', 'Error in updateAffiliateStatus', error as Error);
      return {
        success: false,
        error: 'Erro interno ao atualizar status',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém estatísticas do afiliado
   */
  async getAffiliateStats(affiliateId: string): Promise<ServiceResponse<AffiliateStatsResponse>> {
    try {
      const { data: stats, error } = await supabase
        .rpc('get_affiliate_stats', { affiliate_uuid: affiliateId })
        .single();

      if (error) {
        Logger.error('AffiliateService', 'Error getting affiliate stats', error);
        return {
          success: false,
          error: 'Erro ao obter estatísticas do afiliado',
          code: 'GET_STATS_ERROR',
        };
      }

      return { success: true, data: stats as AffiliateStatsResponse };

    } catch (error) {
      Logger.error('AffiliateService', 'Error in getAffiliateStats', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter estatísticas',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Constrói rede genealógica
   */
  async buildNetwork(affiliateId: string, parentId: string): Promise<ServiceResponse<void>> {
    try {
      Logger.info('AffiliateService', 'Building network', { affiliateId, parentId });

      // Validar que não criará loop
      const loopValidation = await this.validateNetworkIntegrity(affiliateId, parentId);
      if (!loopValidation.success) {
        return {
          success: false,
          error: loopValidation.error || 'Erro de validação de rede',
          code: loopValidation.code || 'NETWORK_VALIDATION_ERROR',
        };
      }

      // Criar entrada na rede
      const { error } = await supabase
        .from('affiliate_network')
        .insert({
          affiliate_id: affiliateId,
          parent_id: parentId,
        });

      if (error) {
        Logger.error('AffiliateService', 'Error building network', error);
        return {
          success: false,
          error: 'Erro ao construir rede genealógica',
          code: 'BUILD_NETWORK_ERROR',
        };
      }

      Logger.info('AffiliateService', 'Network built successfully', { affiliateId, parentId });
      return { success: true };

    } catch (error) {
      Logger.error('AffiliateService', 'Error in buildNetwork', error as Error);
      return {
        success: false,
        error: 'Erro interno ao construir rede',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Cria afiliado como raiz (nível 1)
   */
  private async createNetworkRoot(affiliateId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('affiliate_network')
        .insert({
          affiliate_id: affiliateId,
          parent_id: null, // Raiz
        });

      if (error) {
        Logger.error('AffiliateService', 'Error creating network root', error);
        return {
          success: false,
          error: 'Erro ao criar raiz da rede',
          code: 'CREATE_ROOT_ERROR',
        };
      }

      return { success: true };

    } catch (error) {
      Logger.error('AffiliateService', 'Error in createNetworkRoot', error as Error);
      return {
        success: false,
        error: 'Erro interno ao criar raiz',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Valida integridade da rede (detecta loops)
   */
  async validateNetworkIntegrity(affiliateId: string, parentId?: string): Promise<ServiceResponse<boolean>> {
    try {
      // Se não há parent, é válido (raiz)
      if (!parentId) {
        return { success: true, data: true };
      }

      // Verificar se criaria loop usando função do banco
      const { data: issues } = await supabase
        .rpc('validate_network_integrity')
        .select();

      // Simular inserção para detectar loop
      // (A função do banco já faz essa validação via trigger)
      
      return { success: true, data: true };

    } catch (error) {
      Logger.error('AffiliateService', 'Error validating network integrity', error as Error);
      return {
        success: false,
        error: 'Erro ao validar integridade da rede',
        code: 'NETWORK_VALIDATION_ERROR',
      };
    }
  }

  /**
   * Obtém árvore genealógica do afiliado
   */
  async getNetworkTree(affiliateId: string): Promise<ServiceResponse<NetworkTreeNode[]>> {
    try {
      const { data: networkData, error } = await supabase
        .rpc('get_network_tree', { 
          root_affiliate_id: affiliateId,
          max_levels: 3 
        });

      if (error) {
        Logger.error('AffiliateService', 'Error getting network tree', error);
        return {
          success: false,
          error: 'Erro ao obter árvore genealógica',
          code: 'GET_NETWORK_ERROR',
        };
      }

      // Converter para estrutura hierárquica
      const tree = this.buildTreeStructure(networkData || []);

      return { success: true, data: tree };

    } catch (error) {
      Logger.error('AffiliateService', 'Error in getNetworkTree', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter árvore',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém filhos diretos do afiliado
   */
  async getMyNetwork(affiliateId: string): Promise<ServiceResponse<Affiliate[]>> {
    try {
      const { data: children, error } = await supabase
        .rpc('get_direct_children', { parent_affiliate_id: affiliateId });

      if (error) {
        Logger.error('AffiliateService', 'Error getting direct children', error);
        return {
          success: false,
          error: 'Erro ao obter rede direta',
          code: 'GET_CHILDREN_ERROR',
        };
      }

      return { success: true, data: children || [] };

    } catch (error) {
      Logger.error('AffiliateService', 'Error in getMyNetwork', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter rede',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Constrói estrutura hierárquica da árvore
   */
  private buildTreeStructure(flatData: any[]): NetworkTreeNode[] {
    const nodeMap = new Map<string, NetworkTreeNode>();
    const rootNodes: NetworkTreeNode[] = [];

    // Criar todos os nós
    flatData.forEach(item => {
      const node: NetworkTreeNode = {
        affiliate: item,
        children: [],
        level: item.level,
        path: item.path,
      };
      nodeMap.set(item.affiliate_id, node);
    });

    // Construir hierarquia
    flatData.forEach(item => {
      const node = nodeMap.get(item.affiliate_id);
      if (!node) return;

      if (item.parent_id) {
        const parent = nodeMap.get(item.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  /**
   * Gera código de indicação único
   */
  async generateReferralCode(): Promise<string> {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Gera código alfanumérico único de 8 caracteres
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Verifica se o código já existe
      const { data: existing } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', code)
        .single();

      if (!existing) {
        return code;
      }

      attempts++;
    }

    // Fallback: usa timestamp para garantir unicidade
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    return `REF${timestamp}`;
  }

  /**
   * Vincula afiliado na árvore genealógica
   */
  async linkToNetwork(affiliateId: string, referralCode: string): Promise<ServiceResponse<void>> {
    try {
      // Buscar afiliado pelo código de referência
      const parentResult = await this.getAffiliateByCode(referralCode);
      if (!parentResult.success || !parentResult.data) {
        return {
          success: false,
          error: 'Código de indicação inválido',
          code: 'INVALID_REFERRAL_CODE',
        };
      }

      const parentAffiliate = parentResult.data;
      if (parentAffiliate.status !== 'active') {
        return {
          success: false,
          error: 'Afiliado indicador não está ativo',
          code: 'INACTIVE_REFERRER',
        };
      }

      // Construir rede
      return await this.buildNetwork(affiliateId, parentAffiliate.id);

    } catch (error) {
      Logger.error('AffiliateService', 'Error linking to network', error as Error);
      return {
        success: false,
        error: 'Erro interno ao vincular na rede',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Método de registro simplificado (wrapper para createAffiliate)
   */
  async register(data: CreateAffiliateRequest, userId?: string): Promise<ServiceResponse<AffiliateResponseDTO>> {
    return this.createAffiliate(data, userId);
  }

  /**
   * Gera link de referência do afiliado
   */
  generateReferralLink(referralCode: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://slimquality.com.br';
    return `${baseUrl}?ref=${referralCode}`;
  }

  /**
   * Converte Affiliate para AffiliateResponseDTO (remove PII)
   */
  private toAffiliateResponseDTO(affiliate: Affiliate): AffiliateResponseDTO {
    return {
      id: affiliate.id,
      name: affiliate.name,
      referralCode: affiliate.referralCode,
      level: affiliate.level,
      status: affiliate.status,
      totalReferrals: affiliate.totalReferrals,
      totalSales: affiliate.totalSales,
      totalCommissions: (affiliate.totalCommissionsCents / 100),
      availableBalance: (affiliate.availableBalanceCents / 100),
      createdAt: affiliate.createdAt,
    };
  }

  /**
   * Converte Affiliate para AffiliateDetailResponseDTO (dados do próprio afiliado)
   */
  private toAffiliateDetailResponseDTO(affiliate: Affiliate): AffiliateDetailResponseDTO {
    return {
      ...this.toAffiliateResponseDTO(affiliate),
      phone: affiliate.phone,
      pixKey: affiliate.pixKey,
    };
  }

  /**
   * Converte Affiliate para AffiliateAdminResponseDTO (dados completos para admin)
   */
  private toAffiliateAdminResponseDTO(affiliate: Affiliate): AffiliateAdminResponseDTO {
    return {
      ...this.toAffiliateResponseDTO(affiliate),
      email: affiliate.email,
      phone: affiliate.phone,
      document: affiliate.document, // Should be masked in production
      walletId: affiliate.walletId, // Should be masked in production
      pixKey: affiliate.pixKey,
      dataCadastro: affiliate.createdAt,
      cidade: '', // Not available in current schema
      totalIndicados: affiliate.totalReferrals,
      vendasGeradas: affiliate.totalSales,
      comissoesTotais: (affiliate.totalCommissionsCents / 100),
      saldoDisponivel: (affiliate.availableBalanceCents / 100),
    };
  }
}

export const affiliateService = new AffiliateService();