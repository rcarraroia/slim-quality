import { Router } from 'express';
import { AppointmentController } from '@/api/controllers/appointment.controller';
import { authenticateToken } from '@/api/middlewares/auth.middleware';
import { requireRole } from '@/api/middlewares/role.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();
const appointmentController = new AppointmentController();

// Rate limiting específico para agendamentos
const appointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 requests por IP
  message: {
    error: 'Muitas requisições para agendamentos. Tente novamente em 15 minutos.'
  }
});

// Rate limiting mais restritivo para criação
const createLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // 10 criações por IP
  message: {
    error: 'Muitas tentativas de criação. Tente novamente em 5 minutos.'
  }
});

// Aplicar middlewares globais
router.use(appointmentLimiter);
router.use(authenticateToken);

/**
 * GET /api/appointments
 * Lista agendamentos com filtros
 * Acesso: agent, manager, admin
 */
router.get('/', 
  requireRole(['agent', 'manager', 'admin']),
  appointmentController.list.bind(appointmentController)
);

/**
 * GET /api/appointments/calendar
 * Vista de calendário
 * Acesso: agent, manager, admin
 */
router.get('/calendar',
  requireRole(['agent', 'manager', 'admin']),
  appointmentController.calendar.bind(appointmentController)
);

/**
 * GET /api/appointments/availability
 * Verificar disponibilidade de horário
 * Acesso: agent, manager, admin
 */
router.get('/availability',
  requireRole(['agent', 'manager', 'admin']),
  appointmentController.checkAvailability.bind(appointmentController)
);

/**
 * GET /api/appointments/:id
 * Buscar agendamento por ID
 * Acesso: agent, manager, admin
 */
router.get('/:id',
  requireRole(['agent', 'manager', 'admin']),
  appointmentController.findById.bind(appointmentController)
);

/**
 * POST /api/appointments
 * Criar novo agendamento
 * Acesso: agent, manager, admin
 */
router.post('/',
  createLimiter,
  requireRole(['agent', 'manager', 'admin']),
  appointmentController.create.bind(appointmentController)
);

/**
 * PUT /api/appointments/:id
 * Atualizar agendamento
 * Acesso: agent, manager, admin
 */
router.put('/:id',
  requireRole(['agent', 'manager', 'admin']),
  appointmentController.update.bind(appointmentController)
);

/**
 * PUT /api/appointments/:id/reschedule
 * Reagendar agendamento
 * Acesso: agent, manager, admin
 */
router.put('/:id/reschedule',
  requireRole(['agent', 'manager', 'admin']),
  appointmentController.reschedule.bind(appointmentController)
);

/**
 * PUT /api/appointments/:id/complete
 * Marcar agendamento como concluído
 * Acesso: agent, manager, admin
 */
router.put('/:id/complete',
  requireRole(['agent', 'manager', 'admin']),
  appointmentController.complete.bind(appointmentController)
);

/**
 * DELETE /api/appointments/:id
 * Cancelar agendamento
 * Acesso: agent, manager, admin
 */
router.delete('/:id',
  requireRole(['agent', 'manager', 'admin']),
  appointmentController.cancel.bind(appointmentController)
);

export { router as appointmentRoutes };