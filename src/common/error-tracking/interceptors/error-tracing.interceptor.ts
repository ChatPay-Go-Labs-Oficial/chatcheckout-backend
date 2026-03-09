import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import * as Sentry from '@sentry/node';
import { ErrorTrackingService } from '../error-tracking.service';

/**
 * Error Tracing Interceptor
 *
 * Adds performance monitoring for checkout flows and critical operations.
 * Creates Sentry transactions for performance analysis.
 */
@Injectable()
export class ErrorTracingInterceptor implements NestInterceptor {
  constructor(private readonly errorTracking: ErrorTrackingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    // Skip tracing for health checks (too noisy)
    if (request.url?.startsWith('/health')) {
      return next.handle();
    }

    // Only trace critical operations by default
    const shouldTrace = this.shouldTraceOperation(className, methodName, request);

    if (!shouldTrace) {
      return next.handle();
    }

    // Start a transaction
    const transaction = this.errorTracking.startTransaction(
      `${request.method} ${request.url}`,
      'http.request',
    );

    if (!transaction) {
      return next.handle();
    }

    // Set transaction data
    transaction.setData('url', request.url);
    transaction.setData('method', request.method);
    transaction.setData('handler', `${className}.${methodName}`);

    // Add tags for filtering
    transaction.setTag('controller', className);
    transaction.setTag('method', methodName);
    transaction.setTag('http_method', request.method);

    // Add user context if available
    if (request.user) {
      transaction.setUser({
        id: request.user.id || request.user.sub,
        role: request.user.role,
      });
    }

    // Set transaction on the request for child spans
    (request as any).sentryTransaction = transaction;

    return next.handle().pipe(
      tap({
        next: () => {
          transaction.setStatus('ok');
          transaction.finish();
        },
        error: (error) => {
          transaction.setStatus('internal_error');
          transaction.setData('error', error.message);
          transaction.finish();
        },
      }),
    );
  }

  /**
   * Determine if an operation should be traced
   *
   * Trace critical operations like:
   * - Checkout flows
   * - Payment processing
   * - User authentication
   * - Order operations
   */
  private shouldTraceOperation(
    className: string,
    methodName: string,
    request: Request,
  ): boolean {
    // Always trace checkout operations
    if (
      className.includes('Checkout') ||
      className.includes('Payment') ||
      className.includes('Order') ||
      request.url?.includes('/checkout') ||
      request.url?.includes('/payment') ||
      request.url?.includes('/orders')
    ) {
      return true;
    }

    // Always trace auth operations
    if (
      className.includes('Auth') ||
      methodName === 'login' ||
      methodName === 'register'
    ) {
      return true;
    }

    // Trace Stripe webhook processing
    if (request.url?.includes('/webhooks/stripe')) {
      return true;
    }

    // Sample rate for other operations (10% by default, configurable via env)
    const sampleRate = parseFloat(process.env.TRACES_SAMPLE_RATE || '0.1');
    return Math.random() < sampleRate;
  }
}
