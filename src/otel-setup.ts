import { trace, context as otelContext } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Logger } from '@nestjs/common';

const logger = new Logger('OpenTelemetry');

const tracesEnabled = process.env.TRACES_ENABLED === 'true';
const tempoEndpoint = process.env.TEMPO_ENDPOINT || 'http://localhost:4318/v1/traces';

// Configure the OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'chatcheckout-backend',
    'deployment.environment': process.env.NODE_ENV || 'development',
  }),
  spanProcessor: tracesEnabled
    ? (new BatchSpanProcessor(new OTLPTraceExporter({ url: tempoEndpoint })) as any)
    : undefined,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
    }),
  ],
});

// Initialize the SDK and process with error handling
if (tracesEnabled) {
  sdk.start();
  logger.log(`OpenTelemetry SDK started - Traces sent to: ${tempoEndpoint}`);
} else {
  logger.warn('OpenTelemetry SDK not started - Traces are disabled');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => logger.log('OpenTelemetry SDK terminated'))
    .catch((error) => logger.error('Error terminating OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});

export default sdk;
