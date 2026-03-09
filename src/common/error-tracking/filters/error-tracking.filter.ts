import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorTrackingService } from '../error-tracking.service';

/**
 * Error Tracking Filter
 *
 * Captures all exceptions and sends them to Sentry/GlitchTip.
 * Works alongside HttpExceptionFilter - doesn't change response behavior.
 *
 * This filter is applied via APP_FILTER in the module to catch all errors.
 */
@Injectable()
@Catch()
export class ErrorTrackingFilter implements ExceptionFilter {
  constructor(private readonly errorTracking: ErrorTrackingService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    // Set request context for error tracking
    this.errorTracking.setRequestContext(request);

    // Extract error information
    const error = this.extractError(exception);

    // Capture in Sentry/GlitchTip
    if (error instanceof Error) {
      this.errorTracking.captureException(error, {
        // Additional context
        http_method: request.method,
        http_url: request.url,
        user_agent: request.headers['user-agent'],
      });
    }
  }

  /**
   * Extract Error object from exception
   */
  private extractError(exception: unknown): Error | null {
    if (exception instanceof Error) {
      return exception;
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object') {
        const error = new Error(
          (response as any).message || exception.message,
        );
        error.name = exception.name;
        return error;
      }
    }

    if (typeof exception === 'string') {
      return new Error(exception);
    }

    if (exception && typeof exception === 'object' && 'message' in exception) {
      const error = new Error((exception as any).message);
      error.name = (exception as any).name || 'UnknownError';
      return error;
    }

    return null;
  }
}
