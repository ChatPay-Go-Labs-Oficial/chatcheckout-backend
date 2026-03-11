import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';
import { Logger } from '@nestjs/common';

const logger = new Logger('OpenTelemetry');

/**
 * OpenTelemetry Setup
 *
 * This provides distributed tracing with Grafana Tempo via OTLP.
 * Trace data is correlated with logs (Loki) and metrics (Prometheus).
 *
 * Grafana Stack Integration:
 * - Traces are sent to Tempo via OTLP HTTP endpoint
 * - Trace IDs are automatically included in logs for correlation
 * - Service metrics are available in Prometheus
 */

// Get Tempo endpoint from environment or use default
const tempoEndpoint = process.env.TEMPO_ENDPOINT || 'http://localhost:4318/v1/traces';
const tracesEnabled = process.env.TRACES_ENABLED === 'true' || process.env.NODE_ENV === 'production';

// Configure the OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: 'chatcheckout-backend',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  spanProcessor: tracesEnabled
    ? new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: tempoEndpoint,
        }),
      )
    : new BatchSpanProcessor(new (class NoOpExporter {
      export() { return Promise.resolve(); }
      forceFlush() { return Promise.resolve(); }
      shutdown() { return Promise.resolve(); }
    })()),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req: any) => {
          const url = req.url || '';
          return url.startsWith('/metrics') || url.includes('/heartbeat') || url.startsWith('/health');
        },
      },
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

// Initialize the SDK and process termination
try {
  sdk.start();
  if (tracesEnabled) {
    logger.log(`OpenTelemetry SDK started - Traces sent to Tempo (${tempoEndpoint})`);
  } else {
    logger.log('OpenTelemetry SDK started - Tracing disabled (set TRACES_ENABLED=true or NODE_ENV=production)');
  }
} catch (error) {
  logger.error('Error starting OpenTelemetry SDK', error);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => logger.log('OpenTelemetry SDK shut down'))
    .catch((error) => logger.error('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});

export default sdk;
