import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

/**
 * Logger Decorator
 *
 * Provides a typed logger decorator that automatically includes request context
 * in all log messages. Usage:
 *
 * ```typescript
 * export class MyService {
 *   constructor(@InjectLogger() private readonly logger: AppLogger) {}
 *
 *   myMethod() {
 *     this.logger.log('Processing payment');
 *     // Logs include: userId, sellerId, requestId, etc.
 *   }
 * }
 * ```
 */
export const InjectLogger = () => Inject(RequestLogger);

/**
 * Request-scoped Logger Service
 *
 * Automatically includes request context (userId, sellerId, correlationId)
 * in all log messages when called within a request context.
 */
@Injectable({ scope: Scope.REQUEST })
export class RequestLogger {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  /**
   * Add context to all log messages
   */
  private enrichContext(context?: Record<string, any>): Record<string, any> {
    const enriched: Record<string, any> = {
      ...context,
    };

    // Add request context
    if (this.request.id) {
      enriched.requestId = this.request.id;
    }

    if (this.request.headers['x-correlation-id']) {
      enriched.correlationId = this.request.headers['x-correlation-id'];
    }

    // Add user context
    if (this.request.user) {
      if (this.request.user.id) {
        enriched.userId = this.request.user.id;
      }
      if (this.request.user.sub) {
        enriched.userId = this.request.user.sub;
      }
      if (this.request.user.role) {
        enriched.userRole = this.request.user.role;
      }
    }

    // Add business context
    if (this.request.sellerId) {
      enriched.sellerId = this.request.sellerId;
    }

    return enriched;
  }

  log(message: any, context?: string | Record<string, any>): void {
    const enrichedContext =
      typeof context === 'string'
        ? { context, ...this.enrichContext() }
        : this.enrichContext(context);

    console.log(JSON.stringify({ message, ...enrichedContext }));
  }

  error(
    message: any,
    trace?: string,
    context?: string | Record<string, any>,
  ): void {
    const enrichedContext =
      typeof context === 'string'
        ? { context, ...this.enrichContext() }
        : this.enrichContext(context);

    console.error(JSON.stringify({ message, trace, ...enrichedContext }));
  }

  warn(message: any, context?: string | Record<string, any>): void {
    const enrichedContext =
      typeof context === 'string'
        ? { context, ...this.enrichContext() }
        : this.enrichContext(context);

    console.warn(JSON.stringify({ message, ...enrichedContext }));
  }

  debug(message: any, context?: string | Record<string, any>): void {
    const enrichedContext =
      typeof context === 'string'
        ? { context, ...this.enrichContext() }
        : this.enrichContext(context);

    console.debug(JSON.stringify({ message, ...enrichedContext }));
  }

  verbose(message: any, context?: string | Record<string, any>): void {
    const enrichedContext =
      typeof context === 'string'
        ? { context, ...this.enrichContext() }
        : this.enrichContext(context);

    console.debug(JSON.stringify({ message, ...enrichedContext }));
  }
}

/**
 * Module-scoped Logger for services without request context
 *
 * Use this in services that run outside of HTTP request context
 * (e.g., cron jobs, background workers)
 */
@Injectable()
export class AppLogger {
  constructor(private readonly context: string) {}

  /**
   * Create a logger with a specific context
   */
  static forContext(context: string): AppLogger {
    return new AppLogger(context);
  }

  log(message: any, context?: Record<string, any>): void {
    console.log(JSON.stringify({ context: this.context, message, ...context }));
  }

  error(message: any, trace?: string, context?: Record<string, any>): void {
    console.error(JSON.stringify({ context: this.context, message, trace, ...context }));
  }

  warn(message: any, context?: Record<string, any>): void {
    console.warn(JSON.stringify({ context: this.context, message, ...context }));
  }

  debug(message: any, context?: Record<string, any>): void {
    console.debug(JSON.stringify({ context: this.context, message, ...context }));
  }
}
