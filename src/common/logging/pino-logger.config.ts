import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { multistream } from 'pino';

/**
 * Pino Logger Configuration Factory
 *
 * Provides different configurations for development and production environments:
 * - Development: Pretty-printed logs with colors for local debugging
 * - Production: Structured JSON logs for Railway log aggregation
 */
export const pinoLoggerConfig = (
  configService: ConfigService,
): Params => ({
  pinoHttp: {
    // Transport configuration
    transport:
      configService.get('NODE_ENV') === 'production'
        ? undefined // Use default (JSON) in production
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname,reqId,req.headers,res.headers',
              singleLine: false,
              levelFirst: true,
              messageFormat: '{req.method} {req.url} - {msg}',
            },
          },

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
      req: (req) => ({
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
      res: (res) => ({
        statusCode: res.statusCode,
      }),
      err: (err) => ({
        type: err.type,
        message: err.message,
        stack: err.stack,
        code: err.code,
      }),
    },

    // Add context to all logs
    mixin: () => ({
      application: 'chatcheckout-backend',
      environment: configService.get('NODE_ENV', 'development'),
    }),

    // Custom timestamp
    timestamp: pino.stdTimeFunctions.isoTime,

    // Add request ID
    genReqId: (req) => {
      const requestId =
        req.headers['x-request-id'] ||
        req.headers['x-correlation-id'] ||
        generateRequestId();
      req.id = requestId;
      return requestId;
    },

    // Auto-level logging for different status codes
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';
      }
      if (res.statusCode >= 500 || err) {
        return 'error';
      }
      return 'info';
    },

    // Custom success message
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} - ${res.statusCode}`;
    },

    // Custom error message
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },
    // Avoid logging health checks and heartbeats
    autoLogging: {
      ignore: (req) => {
        const url = req.url || '';
        return url.startsWith('/health') || url.includes('/heartbeat');
      },
    },
  },
});

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Import pino for stdTimeFunctions
import pino from 'pino';
