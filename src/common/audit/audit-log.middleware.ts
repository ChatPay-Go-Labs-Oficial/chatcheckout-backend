import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para auditoria de operações sensíveis
 * Registra tentativas de modificação em recursos protegidos
 */
@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger('AuditLog');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const originalSend = res.send;
    const logger = this.logger; // Capturar logger para usar dentro da função

    // Intercepta o response para logar após a execução
    res.send = function (this: Response, ...args: any[]): Response {
      const duration = Date.now() - startTime;

      // Logar operações de modificação em recursos sensíveis
      const isModification = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      const isSensitiveResource = req.url.includes('/order') ||
                                  req.url.includes('/product') ||
                                  req.url.includes('/user');

      if (isModification && isSensitiveResource) {
        const userId = (req.user as any)?.userId || 'anonymous';
        const ip = req.ip || req.socket.remoteAddress || 'unknown';

        const auditLog = {
          method: req.method,
          url: req.url,
          userId,
          ip,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        };

        // Log com nível diferente dependendo do status
        if (res.statusCode >= 400) {
          // Log de erro/não autorizado - pode indicar tentativa de ataque
          logger.warn(`Failed operation attempt: ${JSON.stringify(auditLog)}`);
        } else {
          // Log de operação bem-sucedida
          logger.log(`Operation: ${JSON.stringify(auditLog)}`);
        }
      }

      return originalSend.apply(this, args);
    }.bind(res);

    next();
  }
}
