import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import pino from 'pino';
import { trace, context } from '@opentelemetry/api';

/**
 * Pino Logger Configuration Factory
 *
 * Provides different configurations for development and production environments:
 * - Development: Pretty-printed logs with colors for local debugging
 * - Production: Structured JSON logs for stdout/log aggregation
 *
 * Grafana Stack Integration:
 * - Logs are sent to Loki via LokiService (separate from Pino)
 * - Trace correlation with Tempo via OpenTelemetry trace_id
 * - Metrics available in Prometheus via /metrics endpoint
 */

export const pinoLoggerConfig = (
  configService: ConfigService,
): Params => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  // Build transport targets
  const targets: any[] = [];

  // Add pretty-print for development terminal
  if (!isProduction) {
    targets.push({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname,reqId,req.headers,res.headers',
        singleLine: false,
        levelFirst: true,
        messageFormat: '{req.method} {req.url} - {msg}',
      },
      level: 'trace',
    });
  }

  return {
    pinoHttp: {
      transport: targets.length > 0 ? { targets } : undefined,

      // Redact sensitive data
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.currentPassword',
          'req.body.newPassword',
          'req.body.token',
          'req.body.stripePublicKey',
          'req.body.stripeSecretKey',
          'res.headers.authorization',
        ],
        remove: true,
      },

      // Custom serializers
      serializers: {
        req: (req: any) => ({
          method: req.method,
          url: req.url,
          headers: {
            'user-agent': req.headers['user-agent'],
            'content-type': req.headers['content-type'],
            'x-request-id': req.headers['x-request-id'],
            'x-correlation-id': req.headers['x-correlation-id'],
          },
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        }),
        res: (res: any) => ({
          statusCode: res.statusCode,
        }),
        err: (err: any) => ({
          type: err.type,
          message: err.message,
          stack: err.stack,
          code: err.code,
        }),
      },

      // Add context and OTEL trace correlation
      mixin: () => {
        const span = trace.getSpan(context.active());
        const otelContext = span
          ? {
              trace_id: span.spanContext().traceId,
              span_id: span.spanContext().spanId,
              trace_flags: `0${span.spanContext().traceFlags.toString(16)}`,
            }
          : {};

        return {
          application: 'chatcheckout-backend',
          environment: configService.get('NODE_ENV', 'development'),
          ...otelContext,
        };
      },

      // Custom timestamp
      timestamp: pino.stdTimeFunctions.isoTime,

      // Add request ID
      genReqId: (req: any) => {
        const requestId =
          req.headers['x-request-id'] ||
          req.headers['x-correlation-id'] ||
          generateRequestId();
        req.id = requestId;
        return requestId;
      },

      // Auto-level logging for different status codes
      customLogLevel: (req: any, res: any, err: any) => {
        return err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      },

      // Custom success message
      customSuccessMessage: (req: any, res: any) => {
        return `${req.method} ${req.url} - ${res.statusCode}`;
      },

      // Custom error message
      customErrorMessage: (req: any, res: any, err: any) => {
        return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
      },

      // Avoid logging health checks, heartbeats and metrics
      autoLogging: {
        ignore: (req: any) => {
          const url = req.url || '';
          return (
            url.startsWith('/health') ||
            url.includes('/heartbeat') ||
            url.startsWith('/metrics')
          );
        },
      },
    },
  };
};

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
