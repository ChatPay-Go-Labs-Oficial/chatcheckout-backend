import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Logging Interceptor
 *
 * Adds business context to structured logs including:
 * - User ID and roles
 * - Seller ID for business operations
 * - Request timing
 * - Business context from request metadata
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Extract business context from request
    const businessContext = this.extractBusinessContext(request);

    // Add business context to request metadata for logging
    request.loggingContext = {
      ...businessContext,
      startTime: Date.now(),
    };

    return next.handle().pipe(
      tap({
        next: () => {
          // Calculate request duration
          const startTime = request.loggingContext?.startTime || Date.now();
          const duration = Date.now() - startTime;

          // Log successful request with business context
          this.logRequestCompletion(request, response, duration, businessContext);
        },
        error: (error) => {
          // Calculate request duration
          const startTime = request.loggingContext?.startTime || Date.now();
          const duration = Date.now() - startTime;

          // Log failed request with business context
          this.logRequestError(request, duration, error, businessContext);
        },
      }),
    );
  }

  /**
   * Extract business context from the request
   */
  private extractBusinessContext(request: Request): Record<string, any> {
    const context: Record<string, any> = {
      requestId: request.id || request.headers['x-request-id'],
      correlationId: request.headers['x-correlation-id'],
    };

    // Add user context if available (from JWT payload)
    if (request.user) {
      context.userId = request.user.id || request.user.sub;
      context.userRole = request.user.role;
    }

    // Add seller context if available
    if (request.sellerId) {
      context.sellerId = request.sellerId;
    }

    // Add resource IDs from params
    if (request.params) {
      if (request.params.id) context.resourceId = request.params.id;
      if (request.params.productId) context.productId = request.params.productId;
      if (request.params.orderId) context.orderId = request.params.orderId;
      if (request.params.sellerId) context.sellerId = request.params.sellerId;
    }

    return context;
  }

  /**
   * Log successful request completion with business context
   */
  private logRequestCompletion(
    request: Request,
    response: any,
    duration: number,
    businessContext: Record<string, any>,
  ): void {
    // Skip logging for health checks and heartbeats
    if (
      request.url?.startsWith('/health') ||
      request.url?.includes('/checkout-tracking/heartbeat')
    ) {
      return;
    }

    const logData = {
      method: request.method,
      url: request.url,
      statusCode: response.statusCode,
      duration: `${duration}ms`,
      ...businessContext,
    };

    // Log with appropriate level based on status code
    if (response.statusCode >= 400) {
      this.logger.warn(JSON.stringify(logData));
    } else {
      this.logger.log(JSON.stringify(logData));
    }
  }

  /**
   * Log failed request with business context
   */
  private logRequestError(
    request: Request,
    duration: number,
    error: Error,
    businessContext: Record<string, any>,
  ): void {
    const logData = {
      method: request.method,
      url: request.url,
      duration: `${duration}ms`,
      error: error.message,
      ...businessContext,
    };

    this.logger.error(JSON.stringify(logData), error.stack);
  }
}

/**
 * Extend Express Request type to include logging context
 */
declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        id?: string;
        sub?: string;
        role?: string;
      };
      sellerId?: string;
      loggingContext?: {
        startTime: number;
        [key: string]: any;
      };
    }
  }
}
