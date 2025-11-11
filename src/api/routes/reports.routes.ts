import { Router } from 'express';
import { ReportsController } from '@/api/controllers/reports.controller';
import { authenticateToken } from '@/api/middlewares/auth.middleware';
import { requireRole } from '@/api/middlewares/role.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();
const reportsController = new ReportsController();

// Rate limiting mais restritivo para relatórios
const reportsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 requests por IP (relatórios são pesados)
  message: 'Muitas requisições para relatórios. Tente novamente em 15 minutos.'
});

// Aplicar middlewares globais
router.use(reportsLimiter);
router.use(authenticateToken);

// Dashboard metrics - todos os usuários autenticados
router.get('/dashboard', reportsController.getDashboardMetrics.bind(reportsController));

// Relatórios detalhados - apenas admin e manager
router.get('/customers', 
  requireRole(['admin', 'manager']), 
  reportsController.getCustomersReport.bind(reportsController)
);

router.get('/conversations', 
  requireRole(['admin', 'manager']), 
  reportsController.getConversationsReport.bind(reportsController)
);

router.get('/appointments', 
  requireRole(['admin', 'manager']), 
  reportsController.getAppointmentsReport.bind(reportsController)
);

export { router as reportsRoutes };