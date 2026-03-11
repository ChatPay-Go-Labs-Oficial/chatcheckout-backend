import { Module, Global, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TracingService } from './tracing.service';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

/**
 * Global Tracing Module
 *
 * Configures distributed tracing with correlation IDs throughout the application.
 *
 * Features:
 * - Automatic correlation ID generation/propagation (via middleware)
 * - Request context tracking
 * - Child span creation for operations
 * - Header propagation to external services
 *
 * Environment Variables:
 * - CORRELATION_ID_HEADER: Header name for correlation ID (default: x-correlation-id)
 * - REQUEST_ID_HEADER: Header name for request ID (default: x-request-id)
 */
@Global()
@Module({
  providers: [TracingService, CorrelationIdMiddleware],
  exports: [TracingService],
})
export class TracingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
