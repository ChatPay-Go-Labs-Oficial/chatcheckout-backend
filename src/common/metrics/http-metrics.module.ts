import { Module } from '@nestjs/common';
import { HttpMetricsMiddleware } from './http-metrics.middleware';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { HttpMetricsController } from './http-metrics.controller';

@Module({
  controllers: [HttpMetricsController],
})
export class HttpMetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HttpMetricsMiddleware)
      .exclude('/health', '/metrics', '/favicon.ico')
      .forRoutes('*');
  }
}
