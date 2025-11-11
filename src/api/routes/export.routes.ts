import { Router } from 'express';
import { ExportController } from '@/api/controllers/export.controller';
import { authenticateToken } from '@/api/middlewares/auth.middleware';
import { requireRole } from '@/api/middlewares/role.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();
const exportController = new ExportController();

// Rate limiting muito restritivo para exportações
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 exportações por hora por IP
  message: 'Limite de exportações excedido. Tente novamente em 1 hora.'
});

// Aplicar middlewares globais
router.use(exportLimiter);
router.use(authenticateToken);

// Exportar dados de cliente específico
router.get('/customer/:customer_id', 
  exportController.exportCustomerData.bind(exportController)
);

// Exportar timeline de cliente específico
router.get('/customer/:customer_id/timeline', 
  exportController.exportCustomerTimeline.bind(exportController)
);

// Exportar todos os clientes - apenas admin e manager
router.get('/customers', 
  requireRole(['admin', 'manager']), 
  exportController.exportAllCustomers.bind(exportController)
);

export { router as exportRoutes };