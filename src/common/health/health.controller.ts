import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import type { HealthCheckResult as TerminusHealthCheckResult } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './indicators/database.health.indicator';
import { RedisHealthIndicator } from './indicators/redis.health.indicator';

// Type alias to avoid naming conflicts
type HealthCheckResult = TerminusHealthCheckResult;

/**
 * Health Check Controller
 *
 * Provides multiple health endpoints for monitoring:
 * - GET /health - Basic health (for Railway)
 * - GET /health/ready - Readiness probe
 * - GET /health/live - Liveness probe
 * - GET /health/deep - Full diagnostics
 */
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: DatabaseHealthIndicator,
    private redis: RedisHealthIndicator,
    private typeOrmHealth: TypeOrmHealthIndicator,
  ) {}

  /**
   * Basic health check
   *
   * Used by Railway's health check monitoring.
   * Returns quickly with minimal checks.
   *
   * Railway will restart the container if this fails.
   */
  @Get()
  @HealthCheck()
  async basic(): Promise<HealthCheckResult> {
    return this.health.check([
      // Only check database connectivity - fast but thorough
      () => this.db.isHealthy(),
    ]);
  }

  /**
   * Readiness probe
   *
   * Indicates if the application is ready to handle requests.
   * Checks all dependencies (database, redis).
   */
  @Get('ready')
  @HealthCheck()
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.isHealthy(),
      () => this.redis.isHealthy(),
    ]);
  }

  /**
   * Liveness probe
   *
   * Indicates if the application is running.
   * Minimal check - just verifies the app is responsive.
   *
   * Kubernetes/Railway uses this to know if the container needs restart.
   */
  @Get('live')
  @HealthCheck()
  async live(): Promise<HealthCheckResult> {
    // No actual checks - just returning success means the app is alive
    return this.health.check([]);
  }

  /**
   * Deep health check
   *
   * Comprehensive diagnostics including:
   * - Database with performance metrics
   * - Redis with memory and stats
   * - System information
   *
   * Use for monitoring dashboards and troubleshooting.
   */
  @Get('deep')
  @HealthCheck()
  async deep(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.isDeepHealthy(),
      () => this.redis.isDeepHealthy(),
      // Include TypeORM's default health check for additional info
      () => this.typeOrmHealth.pingCheck('database_orm', { timeout: 5000 }),
    ]);
  }
}
