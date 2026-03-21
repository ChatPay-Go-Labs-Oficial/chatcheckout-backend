import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuditLogMiddleware } from './audit-log.middleware';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';

/**
 * Módulo de auditoria para rastrear operações sensíveis no banco de dados
 * Inclui:
 * - Middleware para log de operações HTTP
 * - Tabela audit_log no banco com triggers
 * - Controller para consulta de logs
 */
@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplica middleware de auditoria a todas as rotas
    consumer.apply(AuditLogMiddleware).forRoutes('*');
  }
}
