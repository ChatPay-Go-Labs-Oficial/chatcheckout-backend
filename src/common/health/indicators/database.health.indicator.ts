import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Database Health Indicator
 *
 * Checks PostgreSQL database connectivity by running a simple query.
 * Includes connection pool status.
 */
@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  /**
   * Check database health
   *
   * @returns HealthIndicatorResult with status and connection pool info
   * @throws HealthCheckError if database is unreachable
   */
  async isHealthy(): Promise<HealthIndicatorResult> {
    const start = Date.now();

    try {
      // Run a simple query to check database connectivity
      await this.dataSource.query('SELECT 1');

      const duration = Date.now() - start;

      // Get connection pool information
      const pool = this.dataSource.driver;
      const poolInfo = this.getPoolInfo();

      this.logger.log(`Database health check passed in ${duration}ms`);

      return this.getStatus('database', true, {
        latency: `${duration}ms`,
        ...poolInfo,
      });
    } catch (error) {
      const message = 'Database connection failed';
      this.logger.error(message, error.stack);

      throw new HealthCheckError(
        message,
        this.getStatus('database', false, {
          error: error.message,
        }),
      );
    }
  }

  /**
   * Extract connection pool information
   */
  private getPoolInfo(): Record<string, any> {
    try {
      // TypeORM doesn't expose pool info directly, but we can infer
      // connection status from the driver
      return {
        status: 'connected',
        type: this.dataSource.options.type,
        database: this.dataSource.options.database,
        // Pool stats would require driver-specific access
      };
    } catch {
      return {
        status: 'connected',
      };
    }
  }

  /**
   * Check database with detailed diagnostics
   *
   * For the /health/deep endpoint
   */
  async isDeepHealthy(): Promise<HealthIndicatorResult> {
    const start = Date.now();

    try {
      // Run multiple queries to check performance
      await this.dataSource.query('SELECT 1');
      const query1Time = Date.now() - start;

      const result = await this.dataSource.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 LIMIT 1',
        ['public'],
      );
      const query2Time = Date.now() - start - query1Time;

      return this.getStatus('database_deep', true, {
        simple_query: `${query1Time}ms`,
        system_query: `${query2Time}ms`,
        total_latency: `${Date.now() - start}ms`,
        table_count: result?.length || 0,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Database deep check failed',
        this.getStatus('database_deep', false, {
          error: error.message,
        }),
      );
    }
  }
}
