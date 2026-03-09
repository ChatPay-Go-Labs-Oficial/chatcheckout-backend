import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { ErrorTrackingService } from './error-tracking.service';
import { ErrorTrackingFilter } from './filters/error-tracking.filter';
import { ErrorTracingInterceptor } from './interceptors/error-tracing.interceptor';

/**
 * Global Error Tracking Module
 *
 * Integrates Sentry for error tracking and performance monitoring.
 * Compatible with GlitchTip (open-source Sentry alternative).
 *
 * Features:
 * - Automatic error capturing to Sentry/GlitchTip
 * - Performance monitoring for checkout flows
 * - Release tracking (link to Railway deployments)
 * - Business context (userId, sellerId, orderId)
 *
 * Environment Variables:
 * - GLITCHTIP_DSN: Your Sentry DSN (or GlitchTip DSN)
 * - SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 * - TRACES_SAMPLE_RATE: Sample rate for performance traces (0.0 to 1.0)
 * - ERROR_TRACKING_ENABLED: Enable/disable error tracking (true/false)
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    ErrorTrackingService,
    {
      provide: APP_FILTER,
      useClass: ErrorTrackingFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorTracingInterceptor,
    },
  ],
  exports: [ErrorTrackingService],
})
export class ErrorTrackingModule {
  constructor(private readonly errorTracking: ErrorTrackingService) {}

  /**
   * Initialize Sentry on module init
   * Called by NestJS when the module is initialized
   */
  static initializeSentry(): void {
    const dsn = process.env.GLITCHTIP_DSN || process.env.SENTRY_DSN;
    const enabled = process.env.ERROR_TRACKING_ENABLED === 'true';

    if (!enabled || !dsn) {
      console.log('Error tracking disabled or DSN not configured');
      return;
    }

    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
      tracesSampleRate: parseFloat(process.env.TRACES_SAMPLE_RATE || '0.1'),

      // Release tracking for Railway deployments
      release: process.env.RAILWAY_DEPLOYMENT_ID || process.env.RELEASE_VERSION || 'dev',

      // beforeSend to filter and add context
      beforeSend(event, hint) {
        // Filter out expected errors
        if (event.exception) {
          const exception = hint.originalException;

          // Don't send validation errors
          if (exception instanceof Error && exception.message.includes('validation')) {
            return null;
          }
        }

        // Add custom context
        event.tags = {
          ...event.tags,
          application: 'chatcheckout-backend',
        };

        return event;
      },

      // Before send transaction
      beforeSendTransaction(event) {
        // Filter out health check transactions
        if (event.transaction?.includes('/health')) {
          return null;
        }
        return event;
      },

      // Debug mode for development
      debug: process.env.NODE_ENV === 'development',
    });

    console.log(`Sentry initialized with environment: ${process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV}`);
  }
}
