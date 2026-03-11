import { Injectable, Logger, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { trace, context as otelContext } from '@opentelemetry/api';

interface LokiStream {
  stream: Record<string, string>;
  values: [string, string][];
}

interface LokiPushRequest {
  streams: LokiStream[];
}

/**
 * Loki Service for sending logs to Grafana Loki
 *
 * This service provides a direct HTTP-based integration with Loki
 * that works alongside the Pino logger.
 */
@Injectable()
export class LokiService implements LoggerService {
  private readonly logger = new Logger(LokiService.name);
  private readonly lokiUrl: string;
  private readonly enabled: boolean;
  private readonly application: string;
  private readonly environment: string;
  private readonly batch: [string, string][] = [];
  private readonly batchSize = 50;
  private readonly batchInterval = 5000; // 5 seconds
  private batchTimer?: NodeJS.Timeout;

  constructor(private configService: ConfigService) {
    this.lokiUrl = this.configService.get<string>('LOKI_URL', 'http://localhost:3100');
    this.enabled = this.configService.get<boolean>('LOKI_ENABLED', false);
    this.application = 'chatcheckout-backend';
    this.environment = this.configService.get<string>('NODE_ENV', 'development');

    if (this.enabled) {
      this.startBatching();
      this.logger.log(`Loki integration enabled - sending logs to ${this.lokiUrl}`);
    }
  }

  /**
   * Send a log entry to Loki
   */
  sendLog(level: string, message: string, context?: Record<string, any>, traceId?: string) {
    if (!this.enabled) {
      return;
    }

    const activeSpan = trace.getSpan(otelContext.active());
    const currentTraceId = traceId || activeSpan?.spanContext().traceId;

    const labels: Record<string, string> = {
      application: this.application,
      environment: this.environment,
      level,
    };

    if (currentTraceId) {
      labels.trace_id = currentTraceId;
    }

    // Loki expects nanoseconds since epoch
    const timestamp = (Date.now() * 1000000).toString();
    const logEntry = JSON.stringify({
      message,
      trace_id: currentTraceId,
      ...context,
    });

    this.batch.push([timestamp, logEntry]);

    this.logger.debug(`Added log to batch (${this.batch.length}/${this.batchSize}): ${message}`);

    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush the batch to Loki
   */
  private async flush() {
    if (this.batch.length === 0) return;

    const batchToFlush = [...this.batch];
    this.batch.length = 0;

    // Group by labels
    const streamsMap = new Map<string, LokiStream>();

    for (const [timestamp, logLine] of batchToFlush) {
      const logData = JSON.parse(logLine);
      const labels: Record<string, string> = {
        application: this.application,
        environment: this.environment,
      };

      if (logData.trace_id) {
        labels.trace_id = logData.trace_id;
      }
      if (logData.level) {
        labels.level = logData.level;
      }

      const labelKey = JSON.stringify(labels);
      if (!streamsMap.has(labelKey)) {
        streamsMap.set(labelKey, {
          stream: labels,
          values: [],
        });
      }

      streamsMap.get(labelKey)!.values.push([timestamp, logLine]);
    }

    const payload: LokiPushRequest = {
      streams: Array.from(streamsMap.values()),
    };

    try {
      const response = await axios.post(`${this.lokiUrl}/loki/api/v1/push`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.debug(`Sent ${batchToFlush.length} logs to Loki`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to send logs to Loki: ${error.message}`);
      if (error.response) {
        this.logger.error(`Loki response: ${JSON.stringify(error.response.data)}`);
      }
    }
  }

  /**
   * Start automatic batching
   */
  private startBatching() {
    this.batchTimer = setInterval(() => {
      this.flush();
    }, this.batchInterval);
  }

  /**
   * Stop batching and flush remaining logs
   */
  onModuleDestroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    this.flush();
  }

  // LoggerService interface implementation
  log(message: any, context?: string) {
    this.sendLog('info', message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.sendLog('error', message, { context, trace });
  }

  warn(message: any, context?: string) {
    this.sendLog('warn', message, { context });
  }

  debug(message: any, context?: string) {
    this.sendLog('debug', message, { context });
  }

  verbose(message: any, context?: string) {
    this.sendLog('trace', message, { context });
  }

  setLogLevels(levels: string[]) {
    // Not implemented for Loki service
  }
}
