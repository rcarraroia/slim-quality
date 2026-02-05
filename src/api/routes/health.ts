/**
 * Health Check API Routes
 * 
 * Endpoints para monitoramento de saúde dos sistemas
 * Task 15.3: Implement health monitoring
 */

import { Router, Request, Response } from 'express';
import { HealthMonitoringService } from '../../services/subscriptions/HealthMonitoringService';
import { LoggerService } from '../../services/subscriptions/LoggerService';

const router = Router();
const healthService = new HealthMonitoringService();
const logger = new LoggerService('HealthAPI');

/**
 * GET /api/health
 * Verificação básica de saúde (lightweight)
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  try {
    logger.info('Health check básico solicitado', { correlationId });

    const basicHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    const duration = Date.now() - startTime;
    logger.info('Health check básico concluído', { correlationId, duration });

    res.status(200).json(basicHealth);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Erro no health check básico', error as Error, { correlationId, duration });

    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/systems
 * Verificação completa de saúde de ambos os sistemas
 */
router.get('/systems', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  try {
    logger.info('Health check completo dos sistemas solicitado', { correlationId });

    const healthStatus = await healthService.checkSystemHealth();
    const duration = Date.now() - startTime;

    logger.info('Health check completo concluído', {
      correlationId,
      duration,
      overall: healthStatus.overall,
      physicalStatus: healthStatus.physicalProducts.status,
      subscriptionStatus: healthStatus.subscriptions.status
    });

    // Determinar status HTTP baseado na saúde geral
    const httpStatus = healthStatus.overall === 'healthy' ? 200 :
                      healthStatus.overall === 'warning' ? 200 : 503;

    res.status(httpStatus).json({
      ...healthStatus,
      timestamp: new Date().toISOString(),
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Erro no health check completo', error as Error, { correlationId, duration });

    res.status(503).json({
      status: 'error',
      message: 'System health check failed',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      duration
    });
  }
});

/**
 * GET /api/health/physical-products
 * Verificação específica do sistema de produtos físicos
 */
router.get('/physical-products', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  try {
    logger.info('Health check do sistema de produtos físicos solicitado', { correlationId });

    const fullHealth = await healthService.checkSystemHealth();
    const physicalHealth = fullHealth.physicalProducts;
    const duration = Date.now() - startTime;

    logger.info('Health check de produtos físicos concluído', {
      correlationId,
      duration,
      status: physicalHealth.status
    });

    const httpStatus = physicalHealth.status === 'healthy' ? 200 :
                      physicalHealth.status === 'warning' ? 200 : 503;

    res.status(httpStatus).json({
      ...physicalHealth,
      timestamp: new Date().toISOString(),
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Erro no health check de produtos físicos', error as Error, { correlationId, duration });

    res.status(503).json({
      status: 'error',
      message: 'Physical products health check failed',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      duration
    });
  }
});

/**
 * GET /api/health/subscriptions
 * Verificação específica do sistema de assinaturas
 */
router.get('/subscriptions', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  try {
    logger.info('Health check do sistema de assinaturas solicitado', { correlationId });

    const fullHealth = await healthService.checkSystemHealth();
    const subscriptionHealth = fullHealth.subscriptions;
    const duration = Date.now() - startTime;

    logger.info('Health check de assinaturas concluído', {
      correlationId,
      duration,
      status: subscriptionHealth.status
    });

    const httpStatus = subscriptionHealth.status === 'healthy' ? 200 :
                      subscriptionHealth.status === 'warning' ? 200 : 503;

    res.status(httpStatus).json({
      ...subscriptionHealth,
      timestamp: new Date().toISOString(),
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Erro no health check de assinaturas', error as Error, { correlationId, duration });

    res.status(503).json({
      status: 'error',
      message: 'Subscriptions health check failed',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      duration
    });
  }
});

/**
 * GET /api/health/report
 * Relatório de saúde em formato texto legível
 */
router.get('/report', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  try {
    logger.info('Relatório de saúde solicitado', { correlationId });

    const healthStatus = await healthService.checkSystemHealth();
    const report = healthService.generateHealthReport(healthStatus);
    const duration = Date.now() - startTime;

    logger.info('Relatório de saúde gerado', {
      correlationId,
      duration,
      overall: healthStatus.overall
    });

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(report);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Erro na geração do relatório de saúde', error as Error, { correlationId, duration });

    res.status(503).send(`# ERRO NO RELATÓRIO DE SAÚDE

Erro: ${(error as Error).message}
Timestamp: ${new Date().toISOString()}
Duration: ${duration}ms
`);
  }
});

/**
 * GET /api/health/database
 * Verificação específica da integridade do banco de dados
 */
router.get('/database', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();

  try {
    logger.info('Verificação de integridade do banco solicitada', { correlationId });

    const fullHealth = await healthService.checkSystemHealth();
    
    // Extrair apenas checks relacionados ao banco
    const databaseChecks = [
      ...fullHealth.physicalProducts.checks.filter(check => 
        check.name.includes('database') || check.name.includes('table')
      ),
      ...fullHealth.subscriptions.checks.filter(check => 
        check.name.includes('database') || check.name.includes('table')
      )
    ];

    const failedChecks = databaseChecks.filter(check => check.status === 'fail');
    const warningChecks = databaseChecks.filter(check => check.status === 'warn');

    const status = failedChecks.length > 0 ? 'critical' :
                  warningChecks.length > 0 ? 'warning' : 'healthy';

    const duration = Date.now() - startTime;

    logger.info('Verificação de integridade do banco concluída', {
      correlationId,
      duration,
      status,
      totalChecks: databaseChecks.length,
      failedChecks: failedChecks.length,
      warningChecks: warningChecks.length
    });

    const httpStatus = status === 'healthy' ? 200 : status === 'warning' ? 200 : 503;

    res.status(httpStatus).json({
      status,
      checks: databaseChecks,
      summary: {
        total: databaseChecks.length,
        passed: databaseChecks.filter(c => c.status === 'pass').length,
        warnings: warningChecks.length,
        failed: failedChecks.length
      },
      timestamp: new Date().toISOString(),
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Erro na verificação de integridade do banco', error as Error, { correlationId, duration });

    res.status(503).json({
      status: 'error',
      message: 'Database integrity check failed',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      duration
    });
  }
});

export default router;