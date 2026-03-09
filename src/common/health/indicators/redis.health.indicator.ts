import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { RedisService } from '../../../config/redis.service';

/**
 * Redis Health Indicator
 *
 * Checks Redis connectivity by running a PING command.
 * Includes memory usage and connection information.
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(private readonly redisService: RedisService) {
    super();
  }

  /**
   * Check Redis health
   *
   * @returns HealthIndicatorResult with status and Redis info
   * @throws HealthCheckError if Redis is unreachable
   */
  async isHealthy(): Promise<HealthIndicatorResult> {
    const start = Date.now();

    try {
      const client = this.redisService.getClient();

      // Run PING command to check connectivity
      const response = await client.ping();

      const duration = Date.now() - start;

      if (response !== 'PONG' && response !== true) {
        throw new Error(`Unexpected PING response: ${response}`);
      }

      // Get Redis info
      const info = await this.getRedisInfo(client);

      this.logger.log(`Redis health check passed in ${duration}ms`);

      return this.getStatus('redis', true, {
        latency: `${duration}ms`,
        ...info,
      });
    } catch (error) {
      const message = 'Redis connection failed';
      this.logger.error(message, error.stack);

      throw new HealthCheckError(
        message,
        this.getStatus('redis', false, {
          error: error.message,
        }),
      );
    }
  }

  /**
   * Get Redis information
   */
  private async getRedisInfo(client: any): Promise<Record<string, any>> {
    try {
      // Get basic info (parallel for performance)
      const [info, dbSize] = await Promise.allSettled([
        client.info('memory').catch(() => null),
        client.dbSize().catch(() => null),
      ]);

      const infoMap = this.parseInfoString(
        info.status === 'fulfilled' && info.value ? info.value : '',
      );

      return {
        connected: true,
        used_memory: infoMap.used_memory_human || 'unknown',
        used_memory_peak: infoMap.used_memory_peak_human || 'unknown',
        total_keys: dbSize.status === 'fulfilled' ? dbSize.value : 'unknown',
      };
    } catch {
      return {
        connected: true,
        details_unavailable: true,
      };
    }
  }

  /**
   * Parse Redis INFO response string
   */
  private parseInfoString(infoString: string): Record<string, string> {
    const result: Record<string, string> = {};

    if (!infoString || typeof infoString !== 'string') {
      return result;
    }

    const lines = infoString.split('\r\n');
    for (const line of lines) {
      if (line && !line.startsWith('#') && line.includes(':')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key.trim()] = value.trim();
        }
      }
    }

    return result;
  }

  /**
   * Check Redis with detailed diagnostics
   *
   * For the /health/deep endpoint
   */
  async isDeepHealthy(): Promise<HealthIndicatorResult> {
    const start = Date.now();

    try {
      const client = this.redisService.getClient();

      // Run multiple commands for performance check
      const [pingTime, info] = await Promise.all([
        client.ping().then(() => Date.now() - start),
        client.info('stats').catch(() => null),
      ]);

      const infoMap = this.parseInfoString(info || '');

      return this.getStatus('redis_deep', true, {
        ping_latency: `${pingTime}ms`,
        total_connections: infoMap.total_connections_received || 'unknown',
        total_commands: infoMap.total_commands_processed || 'unknown',
        keyspace_hits: infoMap.keyspace_hits || 'unknown',
        keyspace_misses: infoMap.keyspace_misses || 'unknown',
      });
    } catch (error) {
      throw new HealthCheckError(
        'Redis deep check failed',
        this.getStatus('redis_deep', false, {
          error: error.message,
        }),
      );
    }
  }
}
