/**
 * Rotas de API para Afiliados
 * Task 8.1-8.2: Implementar APIs REST para afiliados
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '@/config/supabase';
import { affiliateService } from '@/services/affiliates/affiliate.service';
import { walletValidator } from '@/services/asaas/wallet-validator.service';
import { commissionCalculator } from '@/services/affiliates/commission-calculator.service';
import { documentValidationService } from '@/services/document-validation.service';
import { regularizationService } from '@/services/regularization.service';

const router = Router();

// Schemas de validação
const CreateAffiliateSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  document: z.string().regex(/^\d{11}$|^\d{14}$/).optional(), // CPF ou CNPJ
  walletId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  referralCode: z.string().regex(/^[A-Z0-9]{6}$/).optional()
});

const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'inactive', 'suspended', 'rejected']),
  reason: z.string().min(10).max(500).optional()
});

// Schemas para validação de documentos
const ValidateDocumentSchema = z.object({
  document: z.string().min(11).max(18), // CPF: 11 dígitos, CNPJ: 14 dígitos + formatação
});

const UpdateDocumentSchema = z.object({
  document: z.string().min(11).max(18),
  documentType: z.enum(['CPF', 'CNPJ']).optional() // Opcional, será detectado automaticamente
});

/**
 * POST /api/affiliates/register
 * Cadastro de novo afiliado
 */
router.post('/register', async (req, res) => {
  try {
    // 1. Validar dados de entrada
    const validation = CreateAffiliateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validation.error.issues 
      });
    }

    // 2. Verificar se usuário está autenticado
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // 3. Verificar se usuário já é afiliado
    const { data: existingAffiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (existingAffiliate) {
      return res.status(400).json({ error: 'Usuário já é afiliado' });
    }

    // 4. Criar afiliado
    const affiliate = await affiliateService.createAffiliate(validation.data, userId);

    res.status(201).json({
      success: true,
      data: affiliate,
      message: 'Afiliado cadastrado com sucesso. Aguardando aprovação.'
    });

  } catch (error) {
    console.error('Erro ao cadastrar afiliado:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Erro interno' 
    });
  }
});

/**
 * POST /api/affiliates/validate-wallet
 * Validação de Wallet ID
 */
router.post('/validate-wallet', async (req, res) => {
  try {
    const { walletId } = req.body;
    
    if (!walletId) {
      return res.status(400).json({ error: 'Wallet ID é obrigatória' });
    }

    const validation = await walletValidator.validateWallet(walletId);
    
    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Erro ao validar wallet:', error);
    res.status(500).json({ 
      error: 'Erro interno na validação' 
    });
  }
});

/**
 * GET /api/affiliates/dashboard
 * Dashboard do afiliado autenticado
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // 1. Buscar afiliado do usuário
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .single();

    if (!affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    // 2. Buscar dados do dashboard
    const [stats, network, commissions] = await Promise.all([
      affiliateService.getAffiliateStats(affiliate.id),
      affiliateService.getMyNetwork(affiliate.id),
      getMyCommissions(affiliate.id)
    ]);

    // 3. Gerar link de indicação
    const referralLink = `${process.env.FRONTEND_URL}?ref=${affiliate.referral_code}`;

    res.json({
      success: true,
      data: {
        affiliate: affiliateService.mapAffiliateFromDB(affiliate),
        stats,
        network,
        commissions,
        referralLink
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/affiliates/referral-link
 * Link de indicação do afiliado
 */
router.get('/referral-link', requireAuth, async (req, res) => {
  try {
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('referral_code')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .single();

    if (!affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    const link = `${process.env.FRONTEND_URL}?ref=${affiliate.referral_code}`;
    
    res.json({
      success: true,
      data: {
        link,
        qrCode: generateQRCode(link),
        referralCode: affiliate.referral_code
      }
    });

  } catch (error) {
    console.error('Erro ao gerar link:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/affiliates/network
 * Rede do afiliado (árvore genealógica)
 */
router.get('/network', requireAuth, async (req, res) => {
  try {
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .single();

    if (!affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    const networkTree = await affiliateService.getNetworkTree(affiliate.id);
    
    res.json({
      success: true,
      data: networkTree
    });

  } catch (error) {
    console.error('Erro ao buscar rede:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * POST /api/affiliates/validate-document
 * Validação prévia de documento CPF/CNPJ
 */
router.post('/validate-document', async (req, res) => {
  try {
    // 1. Validar dados de entrada
    const validation = ValidateDocumentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validation.error.issues 
      });
    }

    const { document } = validation.data;

    // 2. Validar documento
    const result = await documentValidationService.validateDocument(document);

    // 3. Retornar resultado
    res.json({
      success: true,
      data: {
        isValid: result.isValid,
        document: result.document,
        type: result.type,
        errors: result.errors,
        isDuplicate: result.isDuplicate,
        // Não retornar existingAffiliateId por segurança
        validationId: result.validationId
      }
    });

  } catch (error) {
    console.error('Erro ao validar documento:', error);
    res.status(500).json({ 
      error: 'Erro interno na validação' 
    });
  }
});

/**
 * PUT /api/affiliates/:id/document
 * Atualização de documento de afiliado
 */
router.put('/:id/document', requireAuth, async (req, res) => {
  try {
    const affiliateId = req.params.id;

    // 1. Validar dados de entrada
    const validation = UpdateDocumentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validation.error.issues 
      });
    }

    const { document } = validation.data;

    // 2. Verificar se afiliado existe e pertence ao usuário
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, user_id, name, email, document, document_type')
      .eq('id', affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    // 3. Verificar autorização (usuário só pode atualizar próprio documento)
    if (affiliate.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    // 4. Validar documento (excluindo o próprio afiliado da verificação de duplicação)
    const validationResult = await documentValidationService.validateDocument(
      document, 
      affiliateId,
      affiliateId // Excluir da verificação de duplicação
    );

    if (!validationResult.isValid) {
      return res.status(400).json({
        error: 'Documento inválido',
        details: validationResult.errors
      });
    }

    // 5. Atualizar documento no banco
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        document: validationResult.document,
        document_type: validationResult.type,
        document_validated_at: now,
        document_validation_source: 'manual_update',
        updated_at: now
      })
      .eq('id', affiliateId);

    if (updateError) {
      console.error('Erro ao atualizar documento:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar documento' });
    }

    // 6. Processar regularização se houver solicitação pendente
    if (validationResult.type === 'CPF' || validationResult.type === 'CNPJ') {
      await regularizationService.processRegularization(
        affiliateId,
        validationResult.document,
        validationResult.type
      );
    }

    res.json({
      success: true,
      data: {
        document: validationResult.document,
        type: validationResult.type,
        validatedAt: now
      },
      message: 'Documento atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/affiliates/:id/regularization-status
 * Status de regularização de afiliado
 */
router.get('/:id/regularization-status', requireAuth, async (req, res) => {
  try {
    const affiliateId = req.params.id;

    // 1. Verificar se afiliado existe e pertence ao usuário
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, user_id')
      .eq('id', affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }

    // 2. Verificar autorização
    if (affiliate.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    // 3. Obter status de regularização
    const status = await regularizationService.getRegularizationStatus(affiliateId);

    if (!status) {
      return res.status(404).json({ error: 'Status de regularização não encontrado' });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Erro ao buscar status de regularização:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Funções auxiliares
async function getMyCommissions(affiliateId: string) {
  try {
    const { data, error } = await supabase
      .from('commissions')
      .select(`
        *,
        order:orders(id, total_cents, created_at)
      `)
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    return [];
  }
}

function generateQRCode(text: string): string {
  // Implementar geração de QR Code
  // Por enquanto retorna URL do serviço online
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
}

// Middleware de autenticação (implementar conforme sistema existente)
function requireAuth(req: any, res: any, next: any) {
  // Implementar verificação de autenticação
  // Por enquanto, assumir que req.user está disponível
  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
}

export default router;