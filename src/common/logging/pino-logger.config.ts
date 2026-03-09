import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import pino from 'pino';
import { trace, context } from '@opentelemetry/api';

/**
 * Pino Logger Configuration Factory
 *
 * Provides different configurations for development and production environments:
 * - Development: Pretty-printed logs with colors for local debugging
 * - Production: Structured JSON logs for Railway log aggregation, optionally sent to Loki
 */
export const pinoLoggerConfig = (
  configService: ConfigService,
): Params => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const lokiUrl = configService.get('LOKI_URL');

  // Configure transports
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
    });
  } else {
    // Basic JSON output for production terminal (if not only using Loki)
    targets.push({
      target: 'pino/file',
      options: { destination: 1 },
    });
  }

  // Add Loki transport if URL exists (Production or Local testing)
  if (lokiUrl) {
    // Ensure the URL has the push endpoint
    const host = lokiUrl.includes('/loki/api/v1/push') 
      ? lokiUrl 
      : `${lokiUrl.endsWith('/') ? lokiUrl.slice(0, -1) : lokiUrl}/loki/api/v1/push`;

    targets.push({
      target: 'pino-loki',
      options: {
        batching: true,
        interval: 1, // 1 second for faster updates in dev
        host,
        labels: { 
          application: 'chatcheckout-backend',
          environment: configService.get('NODE_ENV', 'development'),
        },
      },
    });
  }

  const transport = targets.length > 0 ? { targets } : undefined;

  return {
    pinoHttp: {
      transport,
      // Base logging level
      level: configService.get('LOG_LEVEL', 'info'),

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
        if (res.statusCode >= 400 && res.statusCode < 500) {
          return 'warn';
        }
        if (res.statusCode >= 500 || err) {
          return 'error';
        }
        return 'info';
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

