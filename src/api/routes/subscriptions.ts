/**
 * Rotas de API para Assinaturas
 * Task 13.1: Implementar APIs REST isoladas para frontend
 * CRÍTICO: Rotas completamente separadas das existentes
 */

import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { PaymentOrchestratorService } from '../../services/subscriptions/PaymentOrchestratorService.js';
import { PollingService } from '../../services/subscriptions/PollingService.js';
import { WebhookHandlerService } from '../../services/subscriptions/WebhookHandlerService.js';
import { LoggerService } from '../../services/subscriptions/LoggerService.js';
import { subscriptionFeatureGuard } from '../../middleware/feature-flags.middleware.js';

const router = Router();

// Rate limiting específico para assinaturas
const subscriptionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 requests por IP para assinaturas
  message: {
    error: 'Muitas tentativas de assinatura. Tente novamente em 15 minutos.',
    code: 'SUBSCRIPTION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Instanciar serviços
const paymentOrchestrator = new PaymentOrchestratorService();
const pollingService = new PollingService();
const webhookHandler = new WebhookHandlerService();
const logger = new LoggerService();

// Schemas de validação Zod
const CreatePaymentSchema = z.object({
  userId: z.string().uuid('ID do usuário deve ser um UUID válido'),
  planId: z.string().min(1, 'ID do plano é obrigatório'),
  amount: z.number().positive('Valor deve ser positivo'),
  orderItems: z.array(z.object({
    id: z.string().min(1, 'ID do item é obrigatório'),
    name: z.string().min(1, 'Nome do item é obrigatório'),
    quantity: z.number().int().positive('Quantidade deve ser um número inteiro positivo'),
    value: z.number().positive('Valor do item deve ser positivo'),
    description: z.string().optional(),
    metadata: z.object({
      hasAI: z.boolean().optional(),
      aiFeatures: z.array(z.string()).optional()
    }).optional()
  })).min(1, 'Order Items não pode estar vazio - obrigatório para detecção IA'),
  customerData: z.object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido'),
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
    address: z.object({
      zipCode: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos'),
      street: z.string().min(1, 'Endereço é obrigatório'),
      number: z.string().min(1, 'Número é obrigatório'),
      complement: z.string().optional(),
      neighborhood: z.string().min(1, 'Bairro é obrigatório'),
      city: z.string().min(1, 'Cidade é obrigatória'),
      state: z.string().length(2, 'Estado deve ter 2 caracteres')
    })
  }),
  paymentMethod: z.object({
    type: z.enum(['CREDIT_CARD', 'PIX'], {
      errorMap: () => ({ message: 'Tipo de pagamento deve ser CREDIT_CARD ou PIX' })
    }),
    creditCard: z.object({
      holderName: z.string().min(1, 'Nome do portador é obrigatório'),
      number: z.string().regex(/^\d{16}$/, 'Número do cartão deve ter 16 dígitos'),
      expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Mês de expiração inválido'),
      expiryYear: z.string().regex(/^\d{4}$/, 'Ano de expiração deve ter 4 dígitos'),
      ccv: z.string().regex(/^\d{3,4}$/, 'CCV deve ter 3 ou 4 dígitos')
    }).optional()
  }),
  affiliateData: z.object({
    referralCode: z.string().optional(),
    affiliateId: z.string().uuid().optional()
  }).optional()
});

const CancelSubscriptionSchema = z.object({
  reason: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres').max(500, 'Motivo muito longo'),
  immediate: z.boolean().default(false)
});

/**
 * POST /api/subscriptions/create-payment
 * Criar pagamento de assinatura (primeira mensalidade)
 */
router.post('/create-payment', 
  subscriptionRateLimit, 
  ...subscriptionFeatureGuard('createPayment'),
  async (req, res) => {
  const correlationId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('SubscriptionAPI', 'Iniciando criação de pagamento de assinatura', {
      correlationId,
      userId: req.body?.userId
    });

    // 1. Validar dados de entrada
    const validation = CreatePaymentSchema.safeParse(req.body);
    if (!validation.success) {
      logger.warn('SubscriptionAPI', 'Dados de entrada inválidos', {
        correlationId,
        errors: validation.error.issues
      });
      
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const subscriptionData = validation.data;

    // 2. Validar Order_Items (CRÍTICO)
    if (!subscriptionData.orderItems || subscriptionData.orderItems.length === 0) {
      logger.error('SubscriptionAPI', 'Order Items vazio - obrigatório para detecção IA', {
        correlationId,
        userId: subscriptionData.userId
      });
      
      return res.status(400).json({
        success: false,
        error: 'Order Items é obrigatório e não pode estar vazio - necessário para detecção de produtos IA e cálculo de comissões'
      });
    }

    // 3. Processar pagamento através do orquestrador
    const result = await paymentOrchestrator.processSubscriptionPayment({
      ...subscriptionData,
      correlationId
    });

    if (!result.success) {
      logger.error('SubscriptionAPI', 'Falha no processamento do pagamento', {
        correlationId,
        error: result.error,
        userId: subscriptionData.userId
      });
      
      return res.status(400).json({
        success: false,
        error: result.error || 'Falha no processamento do pagamento'
      });
    }

    logger.info('SubscriptionAPI', 'Pagamento de assinatura criado com sucesso', {
      correlationId,
      paymentId: result.paymentId,
      userId: subscriptionData.userId
    });

    res.status(201).json({
      success: true,
      data: {
        paymentId: result.paymentId,
        status: result.status,
        amount: subscriptionData.amount,
        correlationId,
        pollingUrl: `/api/subscriptions/status/${result.paymentId}`
      },
      message: 'Pagamento de assinatura criado com sucesso. Aguardando confirmação.'
    });

  } catch (error) {
    logger.error('SubscriptionAPI', 'Erro interno na criação de pagamento', {
      correlationId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      correlationId
    });
  }
});

/**
 * GET /api/subscriptions/status/:paymentId
 * Verificar status do pagamento com polling
 */
router.get('/status/:paymentId', 
  subscriptionRateLimit,
  ...subscriptionFeatureGuard('pollPaymentStatus'),
  async (req, res) => {
  const correlationId = `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { paymentId } = req.params;
  
  try {
    logger.info('SubscriptionAPI', 'Verificando status do pagamento', {
      correlationId,
      paymentId
    });

    // 1. Validar paymentId
    if (!paymentId || paymentId.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID inválido'
      });
    }

    // 2. Verificar status via polling service
    const statusResult = await pollingService.checkPaymentStatus(paymentId);

    if (!statusResult.success) {
      logger.warn('SubscriptionAPI', 'Falha na verificação de status', {
        correlationId,
        paymentId,
        error: statusResult.error
      });
      
      return res.status(404).json({
        success: false,
        error: statusResult.error || 'Pagamento não encontrado'
      });
    }

    logger.info('SubscriptionAPI', 'Status verificado com sucesso', {
      correlationId,
      paymentId,
      status: statusResult.status
    });

    res.json({
      success: true,
      data: {
        paymentId,
        status: statusResult.status,
        confirmedAt: statusResult.confirmedAt,
        subscriptionId: statusResult.subscriptionId,
        correlationId
      }
    });

  } catch (error) {
    logger.error('SubscriptionAPI', 'Erro interno na verificação de status', {
      correlationId,
      paymentId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      correlationId
    });
  }
});

/**
 * POST /api/subscriptions/cancel/:subscriptionId
 * Cancelar assinatura
 */
router.post('/cancel/:subscriptionId', 
  subscriptionRateLimit, 
  ...subscriptionFeatureGuard('createSubscription'),
  async (req, res) => {
  const correlationId = `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { subscriptionId } = req.params;
  
  try {
    logger.info('SubscriptionAPI', 'Iniciando cancelamento de assinatura', {
      correlationId,
      subscriptionId
    });

    // 1. Validar subscriptionId
    if (!subscriptionId || subscriptionId.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID inválido'
      });
    }

    // 2. Validar dados de cancelamento
    const validation = CancelSubscriptionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados de cancelamento inválidos',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { reason, immediate } = validation.data;

    // 3. Processar cancelamento
    const cancelResult = await paymentOrchestrator.cancelSubscription(subscriptionId, {
      reason,
      immediate,
      correlationId
    });

    if (!cancelResult.success) {
      logger.error('SubscriptionAPI', 'Falha no cancelamento', {
        correlationId,
        subscriptionId,
        error: cancelResult.error
      });
      
      return res.status(400).json({
        success: false,
        error: cancelResult.error || 'Falha no cancelamento da assinatura'
      });
    }

    logger.info('SubscriptionAPI', 'Assinatura cancelada com sucesso', {
      correlationId,
      subscriptionId,
      immediate
    });

    res.json({
      success: true,
      data: {
        subscriptionId,
        cancelledAt: cancelResult.cancelledAt,
        effectiveDate: cancelResult.effectiveDate,
        refundAmount: cancelResult.refundAmount,
        correlationId
      },
      message: immediate 
        ? 'Assinatura cancelada imediatamente'
        : 'Assinatura será cancelada no final do período atual'
    });

  } catch (error) {
    logger.error('SubscriptionAPI', 'Erro interno no cancelamento', {
      correlationId,
      subscriptionId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      correlationId
    });
  }
});

/**
 * GET /api/subscriptions/health
 * Health check específico para assinaturas
 * NOTA: Health check sempre disponível (sem feature flag)
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'subscription-api',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;