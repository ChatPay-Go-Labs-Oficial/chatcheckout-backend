import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './indicators/database.health.indicator';
import { RedisHealthIndicator } from './indicators/redis.health.indicator';
import { RedisModule } from '../../config/redis.module';

/**
 * Health Check Module
 *
 * Provides health check endpoints for monitoring and orchestration:
 * - Railway health monitoring (restarts on failure)
 * - Kubernetes readiness/liveness probes
 * - Monitoring dashboards
 *
 * Endpoints:
 * - GET /health - Basic health (Railway)
 * - GET /health/ready - Readiness (all dependencies)
 * - GET /health/live - Liveness (app is running)
 * - GET /health/deep - Full diagnostics
 */
@Module({
  imports: [
    TerminusModule,
    RedisModule,
  ],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    TypeOrmHealthIndicator,
  ],
  exports: [
    DatabaseHealthIndicator,
    RedisHealthIndicator,
  ],
})
export class HealthModule {}
