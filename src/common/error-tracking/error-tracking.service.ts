import { Injectable, Inject, Optional } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { Request } from 'express';

/**
 * Error Tracking Service
 *
 * Wraps Sentry functionality for error tracking.
 * Compatible with GlitchTip (uses Sentry SDK protocol).
 *
 * Features:
 * - Automatic error capturing
 * - Performance monitoring
 * - User context tracking
 * - Business context (userId, sellerId, orderId)
 */
@Injectable()
export class ErrorTrackingService {
  private readonly isEnabled: boolean;

  constructor() {
    this.isEnabled = this.checkIfEnabled();
  }

  /**
   * Check if error tracking is enabled
   */
  private checkIfEnabled(): boolean {
    const enabled = process.env.ERROR_TRACKING_ENABLED;
    const dsn = process.env.GLITCHTIP_DSN || process.env.SENTRY_DSN;
    return enabled === 'true' && !!dsn;
  }

  /**
   * Capture an exception
   */
  captureException(exception: Error, context?: Record<string, any>): void {
    if (!this.isEnabled) {
      return;
    }

    Sentry.withScope((scope) => {
      this.addContextToScope(scope, context);
      Sentry.captureException(exception);
    });
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.isEnabled) {
      return;
    }

    Sentry.captureMessage(message, level);
  }

  /**
   * Add user context
   */
  setUser(user: { id: string; email?: string; role?: string }): void {
    if (!this.isEnabled) {
      return;
    }

    Sentry.setUser(user);
  }

  /**
   * Add business context (sellerId, orderId, etc.)
   */
  setBusinessContext(context: {
    sellerId?: string;
    orderId?: string;
    productId?: string;
    sessionId?: string;
  }): void {
    if (!this.isEnabled) {
      return;
    }

    Sentry.setTags(context);
  }

  /**
   * Set request context from Express request
   */
  setRequestContext(request: Request): void {
    if (!this.isEnabled) {
      return;
    }

    Sentry.withScope((scope) => {
      // Add request data
      scope.setContext('request', {
        url: request.url,
        method: request.method,
        headers: this.sanitizeHeaders(request.headers),
        query: request.query,
      });

      // Add correlation ID
      const correlationId = request.headers['x-correlation-id'] as string;
      if (correlationId) {
        scope.setTag('correlation_id', correlationId);
      }

      // Add user from JWT if available
      if (request.user) {
        scope.setUser({
          id: request.user.id || request.user.sub,
          role: request.user.role,
        });
      }

      // Add business context
      const businessContext: Record<string, string> = {};
      if (request.sellerId) {
        businessContext.sellerId = request.sellerId;
      }
      if (request.params?.orderId) {
        businessContext.orderId = request.params.orderId;
      }
      if (request.params?.productId) {
        businessContext.productId = request.params.productId;
      }
      if (request.params?.sessionId) {
        businessContext.sessionId = request.params.sessionId;
      }
      if (Object.keys(businessContext).length > 0) {
        scope.setTags(businessContext);
      }
    });
  }

  /**
   * Start a performance transaction
   */
  startTransaction(name: string, op: string): any | undefined {
    if (!this.isEnabled) {
      return;
    }

    return Sentry.startSpan({ name, op }, () => {
      // Transaction callback
    });
  }

  /**
   * Add context to Sentry scope
   */
  private addContextToScope(scope: Sentry.Scope, context?: Record<string, any>): void {
    if (!context) {
      return;
    }

    // Add extra context
    scope.setExtras(context);

    // Add tags for filtering
    const tags: Record<string, string> = {};
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        tags[key] = String(value);
      }
    }
    scope.setTags(tags);
  }

  /**
   * Sanitize headers to remove sensitive data
   */
  private sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Flush pending events (useful before shutdown)
   */
  async flush(timeout: number = 2000): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    await Sentry.flush(timeout);
  }
}
