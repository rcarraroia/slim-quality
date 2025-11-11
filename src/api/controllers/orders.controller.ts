/**
 * Orders Controller
 * Sprint 3: Sistema de Vendas
 * 
 * Controllers públicos para criação e consulta de pedidos
 */

import { Request, Response } from 'express';
import { orderService } from '@/services/sales/order.service';
import { asaasService } from '@/services/asaas/asaas.service';
import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import {
  CreateOrderSchema,
  CreatePaymentSchema,
  type CreateOrderInput,
  type CreatePaymentInput,
} from '@/api/validators/order.validator';
import type { PaymentMethod, PaymentStatus } from '@/types/sales.types';

/**
 * POST /api/orders
 * Cria um novo pedido
 */
export async function createOrder(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Validar dados com Zod
    const validation = CreateOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validation.error.issues,
      });
    }

    const orderData: CreateOrderInput = validation.data;

    Logger.info('OrdersController', 'Criando pedido', {
      userId,
      itemsCount: orderData.items.length,
    });

    // Criar pedido
    const result = await orderService.createOrder(userId, orderData);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code,
      });
    }

    return res.status(201).json({
      message: 'Pedido criado com sucesso',
      order: result.data,
    });
  } catch (error) {
    Logger.error('OrdersController', 'Erro ao criar pedido', error as Error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * POST /api/orders/:id/payment
 * Gera pagamento para um pedido
 */
export async function createPayment(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const orderId = req.params.id;

    // Validar dados com Zod
    const validation = CreatePaymentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validation.error.issues,
      });
    }

    const paymentData: CreatePaymentInput = validation.data;

    Logger.info('OrdersController', 'Gerando pagamento', {
      userId,
      orderId,
      paymentMethod: paymentData.payment_method,
    });

    // 1. Buscar pedido e validar ownership
    const orderResult = await orderService.getOrderById(orderId, userId);
    if (!orderResult.success || !orderResult.data) {
      return res.status(404).json({
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND',
      });
    }

    const order = orderResult.data;

    // 2. Validar status do pedido
    if (order.status !== 'pending') {
      return res.status(400).json({
        error: `Pedido não pode receber pagamento no status: ${order.status}`,
        code: 'INVALID_ORDER_STATUS',
      });
    }

    // 3. Verificar se já existe pagamento
    if (order.payment) {
      return res.status(400).json({
        error: 'Pedido já possui pagamento',
        code: 'PAYMENT_ALREADY_EXISTS',
      });
    }

    // 4. Criar/buscar customer no Asaas
    const customerResult = await asaasService.getOrCreateCustomer(
      {
        name: order.customer_name,
        email: order.customer_email,
        cpfCnpj: order.customer_cpf || '',
        phone: order.customer_phone,
        mobilePhone: order.customer_phone,
        // Endereço será buscado de shipping_address se necessário
      },
      orderId
    );

    if (!customerResult.success || !customerResult.data) {
      return res.status(500).json({
        error: 'Erro ao criar customer no Asaas',
        code: 'ASAAS_CUSTOMER_ERROR',
      });
    }

    const asaasCustomerId = customerResult.data.id;

    // Atualizar order com asaas_customer_id
    await supabase
      .from('orders')
      .update({ asaas_customer_id: asaasCustomerId })
      .eq('id', orderId);

    // 5. Gerar cobrança baseado no método de pagamento
    const amount = order.total_cents / 100;
    const description = `Pedido #${order.order_number}`;

    // TODO: Buscar afiliados da árvore (Sprint 4)
    const affiliates = undefined;

    if (paymentData.payment_method === 'pix') {
      // Gerar cobrança PIX
      const pixResult = await asaasService.createPixPayment(
        orderId,
        asaasCustomerId,
        amount,
        description,
        affiliates
      );

      if (!pixResult.success || !pixResult.data) {
        return res.status(500).json({
          error: 'Erro ao gerar cobrança PIX',
          code: 'ASAAS_PIX_ERROR',
        });
      }

      // Salvar payment no banco
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          payment_method: 'pix' as PaymentMethod,
          amount_cents: order.total_cents,
          status: 'pending' as PaymentStatus,
          asaas_payment_id: pixResult.data.asaas_payment_id,
          pix_qr_code: pixResult.data.qr_code,
          pix_copy_paste: pixResult.data.copy_paste,
          pix_expires_at: pixResult.data.expires_at,
          installments: 1,
        })
        .select()
        .single();

      if (paymentError) {
        Logger.error('OrdersController', 'Erro ao salvar payment', paymentError);
        return res.status(500).json({
          error: 'Erro ao salvar pagamento',
          code: 'PAYMENT_SAVE_ERROR',
        });
      }

      return res.status(201).json({
        message: 'Pagamento PIX gerado com sucesso',
        payment: {
          id: payment.id,
          method: 'pix',
          status: payment.status,
          amount: amount,
          pix: {
            qr_code: payment.pix_qr_code,
            copy_paste: payment.pix_copy_paste,
            expires_at: payment.pix_expires_at,
          },
        },
      });
    } else if (paymentData.payment_method === 'credit_card') {
      // Validar remoteIp
      if (!paymentData.remote_ip) {
        return res.status(400).json({
          error: 'remoteIp é obrigatório para pagamento com cartão',
          code: 'REMOTE_IP_REQUIRED',
        });
      }

      // Gerar cobrança com cartão
      const cardResult = await asaasService.createCreditCardPayment(
        orderId,
        asaasCustomerId,
        amount,
        description,
        {
          holderName: paymentData.card!.holder_name,
          number: paymentData.card!.number,
          expiryMonth: paymentData.card!.expiry_month,
          expiryYear: paymentData.card!.expiry_year,
          ccv: paymentData.card!.ccv,
        },
        {
          name: paymentData.card_holder!.name,
          email: paymentData.card_holder!.email,
          cpfCnpj: paymentData.card_holder!.cpfCnpj,
          postalCode: paymentData.card_holder!.postalCode,
          addressNumber: paymentData.card_holder!.addressNumber,
          addressComplement: paymentData.card_holder!.addressComplement,
          phone: paymentData.card_holder!.phone,
          mobilePhone: paymentData.card_holder!.mobilePhone,
        },
        paymentData.remote_ip,
        paymentData.installments || 1,
        affiliates
      );

      if (!cardResult.success || !cardResult.data) {
        return res.status(500).json({
          error: 'Erro ao processar pagamento com cartão',
          code: 'ASAAS_CARD_ERROR',
        });
      }

      // Salvar payment no banco
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          payment_method: 'credit_card' as PaymentMethod,
          amount_cents: order.total_cents,
          status: cardResult.data.status as PaymentStatus,
          asaas_payment_id: cardResult.data.asaas_payment_id,
          card_brand: cardResult.data.card_brand,
          card_last_digits: cardResult.data.card_last_digits,
          installments: cardResult.data.installments,
          confirmed_at: cardResult.data.status === 'confirmed' ? new Date().toISOString() : undefined,
        })
        .select()
        .single();

      if (paymentError) {
        Logger.error('OrdersController', 'Erro ao salvar payment', paymentError);
        return res.status(500).json({
          error: 'Erro ao salvar pagamento',
          code: 'PAYMENT_SAVE_ERROR',
        });
      }

      // Se pagamento foi confirmado imediatamente, atualizar order
      if (cardResult.data.status === 'confirmed') {
        await orderService.updateOrderStatus(
          orderId,
          'paid',
          userId,
          'Pagamento com cartão aprovado'
        );
      }

      return res.status(201).json({
        message: 'Pagamento processado com sucesso',
        payment: {
          id: payment.id,
          method: 'credit_card',
          status: payment.status,
          amount: amount,
          card: {
            brand: payment.card_brand,
            last_digits: payment.card_last_digits,
            installments: payment.installments,
          },
        },
      });
    }

    return res.status(400).json({
      error: 'Método de pagamento inválido',
      code: 'INVALID_PAYMENT_METHOD',
    });
  } catch (error) {
    Logger.error('OrdersController', 'Erro ao criar pagamento', error as Error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * GET /api/orders/my-orders
 * Lista pedidos do usuário
 */
export async function getMyOrders(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status as any,
      order_number: req.query.order_number as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
    };

    const result = await orderService.getMyOrders(userId, filters);

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
        code: result.code,
      });
    }

    return res.status(200).json(result.data);
  } catch (error) {
    Logger.error('OrdersController', 'Erro ao listar pedidos', error as Error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * GET /api/orders/:id
 * Busca detalhes de um pedido
 */
export async function getOrderById(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const orderId = req.params.id;

    const result = await orderService.getOrderById(orderId, userId);

    if (!result.success) {
      return res.status(404).json({
        error: result.error,
        code: result.code,
      });
    }

    return res.status(200).json(result.data);
  } catch (error) {
    Logger.error('OrdersController', 'Erro ao buscar pedido', error as Error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * GET /api/orders/:id/status
 * Busca status e histórico de um pedido
 */
export async function getOrderStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const orderId = req.params.id;

    // Validar ownership
    const orderResult = await orderService.getOrderById(orderId, userId);
    if (!orderResult.success) {
      return res.status(404).json({
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND',
      });
    }

    // Buscar histórico
    const historyResult = await orderService.getOrderStatusHistory(orderId);
    if (!historyResult.success) {
      return res.status(500).json({
        error: historyResult.error,
        code: historyResult.code,
      });
    }

    return res.status(200).json({
      current_status: orderResult.data!.status,
      history: historyResult.data,
    });
  } catch (error) {
    Logger.error('OrdersController', 'Erro ao buscar status', error as Error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
