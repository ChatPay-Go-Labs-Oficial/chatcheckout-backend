import { Injectable, Inject, Optional } from '@nestjs/common';
import type { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

/**
 * Tracing Service
 *
 * Provides distributed tracing with OpenTelemetry manual spans.
 * Use this in services to create custom spans for business operations.
 *
 * Example usage:
 * ```typescript
 * // Simple span
 * tracingService.startSpan('user.login', { userId: user.id });
 *
 * // Span with async operation
 * await tracingService.traceAsync(
 *   'database.query',
 *   async () => await this.repository.find()
 * );
 * ```
 */
@Injectable()
export class TracingService {
  private readonly tracer = trace.getTracer('chatcheckout-backend');

  constructor(@Optional() @Inject(REQUEST) private readonly request?: Request) {}

  /**
   * Get the current correlation ID
   */
  getCorrelationId(): string {
    return this.request?.correlationId || String(this.request?.id || '') || 'unknown';
  }

  /**
   * Get the current trace ID from active span
   */
  getTraceId(): string {
    const currentSpan = trace.getSpan(context.active());
    return currentSpan?.spanContext().traceId || 'unknown';
  }

  /**
   * Get the current span ID from active span
   */
  getSpanId(): string {
    const currentSpan = trace.getSpan(context.active());
    return currentSpan?.spanContext().spanId || 'unknown';
  }

  /**
   * Get the current tracing context
   */
  getTracingContext(): {
    correlationId: string;
    traceId: string;
    spanId: string;
  } {
    return {
      correlationId: this.getCorrelationId(),
      traceId: this.getTraceId(),
      spanId: this.getSpanId(),
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

    // Add trace parent for distributed tracing
    const currentSpan = trace.getSpan(context.active());
    if (currentSpan) {
      const spanContext = currentSpan.spanContext();
      headers['traceparent'] = `00-${spanContext.traceId}-${spanContext.spanId}-0${spanContext.traceFlags.toString(16)}`;
    }

    return headers;
  }

  /**
   * Start a new span (fire and forget)
   *
   * Use for simple operations where you don't need to wait for completion
   */
  startSpan(name: string, attributes?: Record<string, any>): void {
    const span = this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes,
    });
    span.end();
  }

  /**
   * Start a span and return it for manual control
   *
   * Usage:
   * ```typescript
   * const span = tracingService.createSpan('database.query');
   * try {
   *   // do work
   * } finally {
   *   span.end();
   * }
   * ```
   */
  createSpan(name: string, attributes?: Record<string, any>) {
    return this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes: {
        ...attributes,
        correlationId: this.getCorrelationId(),
      },
    });
  }

  /**
   * Wrap an async function with automatic tracing
   *
   * Usage:
   * ```typescript
   * const result = await tracingService.traceAsync(
   *   'user.find',
   *   { userId: '123' },
   *   async () => await this.userRepository.findOne({ where: { id: '123' } })
   * );
   * ```
   */
  async traceAsync<T>(
    name: string,
    attributes: Record<string, any>,
    fn: (span: ReturnType<typeof this.tracer.startSpan>) => Promise<T>,
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      name,
      { kind: SpanKind.INTERNAL, attributes: { ...attributes, correlationId: this.getCorrelationId() } },
      async (span) => {
        try {
          const result = await fn(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Record an error on the current span
   */
  recordError(error: Error, attributes?: Record<string, any>): void {
    const currentSpan = trace.getSpan(context.active());
    if (currentSpan) {
      currentSpan.recordException(error);
      currentSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      if (attributes) {
        currentSpan.setAttributes(attributes);
      }
    }
  }

  /**
   * Add attributes to the current span
   */
  setAttributes(attributes: Record<string, any>): void {
    const currentSpan = trace.getSpan(context.active());
    if (currentSpan) {
      currentSpan.setAttributes(attributes);
    }
  }
}
