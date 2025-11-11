import { Router } from 'express';
import { TagController } from '@/api/controllers/tag.controller';
import { authenticateToken } from '@/api/middlewares/auth.middleware';
import { requireRole } from '@/api/middlewares/role.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();
const tagController = new TagController();

// Rate limiting
const tagLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: 'Muitas requisições para tags. Tente novamente em 15 minutos.'
});

// Aplicar middlewares globais
router.use(tagLimiter);
router.use(authenticateToken);

// Rotas públicas (todos os usuários autenticados)
router.get('/', tagController.findAll.bind(tagController));
router.get('/stats', tagController.getUsageStats.bind(tagController));
router.get('/:id', tagController.findById.bind(tagController));

// Sugestões de tags para cliente específico
router.get('/suggest/:customer_id', tagController.suggestTags.bind(tagController));

// Aplicar regras automáticas
router.post('/auto-apply/:customer_id', tagController.applyAutoRules.bind(tagController));

// Rotas administrativas (apenas admin e manager)
router.post('/', 
  requireRole(['admin', 'manager']), 
  tagController.create.bind(tagController)
);

router.put('/:id', 
  requireRole(['admin', 'manager']), 
  tagController.update.bind(tagController)
);

router.delete('/:id', 
  requireRole(['admin', 'manager']), 
  tagController.delete.bind(tagController)
);

export { router as tagRoutes };