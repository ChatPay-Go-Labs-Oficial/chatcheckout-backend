import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID Middleware
 *
 * Generates or extracts correlation IDs for request tracing.
 * Adds correlation ID to:
 * - Request headers (incoming)
 * - Response headers (outgoing)
 * - Request metadata (for access throughout the app)
 * - Async local storage context
 *
 * This enables tracing requests across:
 * - Multiple service calls
 * - Database queries
 * - External API calls (Stripe, Crypto APIs)
 * - Background jobs
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  // Header names (configurable via environment)
  private readonly correlationHeader =
    process.env.CORRELATION_ID_HEADER || 'x-correlation-id';
  private readonly requestHeader =
    process.env.REQUEST_ID_HEADER || 'x-request-id';

  use(req: Request, res: Response, next: NextFunction): void {
    // Extract or generate correlation ID
    const correlationId = this.getOrCreateCorrelationId(req);

    // Set request ID for backward compatibility
    const requestId =
      req.headers[this.requestHeader] as string ||
      req.headers[this.correlationHeader] as string ||
      this.generateId();

    // Store in request for access throughout the app
    req.correlationId = correlationId;
    req.id = correlationId; // For Pino logger

    // Add to response headers for client-side tracing
    res.setHeader(this.correlationHeader, correlationId);
    res.setHeader(this.requestHeader, requestId);

    // Store in async local storage for context access in services
    // (Note: Using request metadata as fallback since we don't have CLS)
    req.tracingContext = {
      correlationId,
      requestId,
      timestamp: Date.now(),
    };

    next();
  }

  /**
   * Get existing correlation ID or generate new one
   */
  private getOrCreateCorrelationId(req: Request): string {
    // Priority order for correlation ID sources:
    // 1. x-correlation-id header (standard)
    // 2. x-request-id header (compatibility)
    // 3. Generate new UUID

    const correlationHeader = req.headers[this.correlationHeader] as string;
    if (correlationHeader && this.isValidId(correlationHeader)) {
      return correlationHeader;
    }

    const requestHeader = req.headers[this.requestHeader] as string;
    if (requestHeader && this.isValidId(requestHeader)) {
      return requestHeader;
    }

    return this.generateId();
  }

  /**
   * Validate ID format (basic check)
   */
  private isValidId(id: string): boolean {
    return typeof id === 'string' && id.length > 0 && id.length < 200;
  }

  /**
   * Generate a unique correlation ID
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = uuidv4().substring(0, 8);
    return `corr-${timestamp}-${random}`;
  }
}

/**
 * Extend Express Request type
 */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      id?: string;
      tracingContext?: {
        correlationId: string;
        requestId: string;
        timestamp: number;
      };
    }
  }
}
