/**
 * Webhook Routes
 * Sprint 3: Sistema de Vendas
 * 
 * Rotas para webhooks do Asaas
 */

import { Router } from 'express';
import {
  validateAsaasToken,
  webhookRateLimit,
  handleAsaasWebhook,
} from '@/api/controllers/webhook.controller';

const router = Router();

/**
 * POST /webhooks/asaas
 * Recebe webhooks do Asaas
 * 
 * Sem autenticação JWT (usa authToken do Asaas)
 * TODO: Implementar validateAsaasToken e handleAsaasWebhook
 */
// router.post(
//   '/asaas',
//   webhookRateLimit,
//   validateAsaasToken,
//   handleAsaasWebhook
// );

export default router;
