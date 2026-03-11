import { Injectable, Inject, Optional } from '@nestjs/common';
import type { Request } from 'express';
import { REQUEST } from '@nestjs/core';

/**
 * Tracing Service
 *
 * Provides access to correlation IDs and request context throughout the application.
 * Used in services to include correlation IDs in logs, database queries, and external API calls.
 */
@Injectable()
export class TracingService {
  constructor(@Optional() @Inject(REQUEST) private readonly request?: Request) {}

  /**
   * Get the current correlation ID
   */
  getCorrelationId(): string {
    return this.request?.correlationId || String(this.request?.id || '') || 'unknown';
  }

  /**
   * Get the current request ID
   */
  getRequestId(): string {
    return this.request?.tracingContext?.requestId || 'unknown';
  }

  /**
   * Get the current tracing context
   */
  getTracingContext(): {
    correlationId: string;
    requestId: string;
    timestamp?: number;
  } {
    return {
      correlationId: this.getCorrelationId(),
      requestId: this.getRequestId(),
      timestamp: this.request?.tracingContext?.timestamp,
    };
  }

  /**
   * Add correlation ID headers to external API calls
   */
  getCorrelationHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.request?.correlationId) {
      headers['x-correlation-id'] = this.request.correlationId;
    }

    if (this.request?.tracingContext?.requestId) {
      headers['x-request-id'] = this.request.tracingContext.requestId;
    }

    return headers;
  }

  /**
   * Create a child span with business context
   *
   * Use for database queries, external API calls, etc.
   */
  createChildSpan(operation: string, data?: Record<string, any>): void {
    // In a full OpenTelemetry setup, this would create a span
    // For now, we log with correlation context
    const context = {
      ...this.getTracingContext(),
      operation,
      ...data,
    };

    // This would be integrated with the logging module
    console.debug('[Span]', JSON.stringify(context));
  }

  /**
   * Wrap a function with tracing context
   *
   * Usage:
   * ```typescript
   * const result = await tracingService.trace(
   *   'database.query',
   *   async () => await this.repository.find()
   * );
   * ```
   */
  async trace<T>(
    operation: string,
    fn: () => Promise<T>,
    data?: Record<string, any>,
  ): Promise<T> {
    const startTime = Date.now();
    this.createChildSpan(operation, data);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.createChildSpan(`${operation}.complete`, {
        duration: `${duration}ms`,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.createChildSpan(`${operation}.error`, {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}
