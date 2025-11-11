/**
 * Express Server
 * Sprint 3: Sistema de Vendas
 * 
 * Servidor principal da API
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Logger } from '@/utils/logger';

// Importar rotas
import ordersRoutes from '@/api/routes/orders.routes';
import adminOrdersRoutes from '@/api/routes/admin-orders.routes';
import webhookRoutes from '@/api/routes/webhook.routes';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// Segurança
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging de requests
app.use((req, res, next) => {
  Logger.info('Server', 'Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ============================================
// ROTAS DA API
// ============================================

// Rotas públicas de pedidos
app.use('/api/orders', ordersRoutes);

// Rotas administrativas de pedidos
app.use('/api/admin/orders', adminOrdersRoutes);

// Rotas de webhooks
app.use('/webhooks', webhookRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 - Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

// Error handler global
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  Logger.error('Server', 'Erro não tratado', err, {
    method: req.method,
    path: req.path,
  });

  res.status(500).json({
    error: 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  Logger.info('Server', `Servidor rodando na porta ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
  });
});

export default app;
