import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';
import { UserModule } from './user/user.module';
import { ChatAiModule } from './chat-ai/chat-ai.module';
import { UploadModule } from './upload/upload.module';
import { RedisModule } from './config/redis.module';
import { StripeModule } from './stripe/stripe.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { CheckoutTrackingModule } from './checkout-tracking/checkout-tracking.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SellerModule } from './seller/seller.module';
import { LoggingModule } from './common/logging/logging.module';
import { HealthModule } from './common/health/health.module';
import { TracingModule } from './common/tracing/tracing.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { BusinessEventsModule } from './common/business-events/business-events.module';
import { HttpMetricsModule } from './common/metrics/http-metrics.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuditModule } from './common/audit/audit.module';

@Module({
  imports: [
    HttpMetricsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    LoggingModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Support Railway's DATABASE_URL format
        const databaseUrl = config.get<string>('DATABASE_URL');

        if (databaseUrl) {
          // Parse DATABASE_URL: postgresql://user:password@host:port/database
          const url = new URL(databaseUrl);
          return {
            type: 'postgres',
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            username: url.username,
            password: url.password,
            database: url.pathname.substring(1), // Remove leading slash
            entities: ['dist/**/*.entity.js'],
            migrations: ['dist/migrations/*.js'],
            synchronize: false,
            logging: config.get('NODE_ENV') === 'development',
            migrationsTableName: 'migrations_history',
            ssl: { rejectUnauthorized: false }, // Railway requires SSL
          };
        }

        // Fallback to individual DATABASE_* variables
        return {
          type: 'postgres',
          host: config.get('DATABASE_HOST', 'localhost'),
          port: config.get('DATABASE_PORT', 5432),
          username: config.get('DATABASE_USER', 'postgres'),
          password: config.get('DATABASE_PASSWORD', 'postgres'),
          database: config.get('DATABASE_NAME', 'chatcheckout'),
          entities: ['dist/**/*.entity.js'],
          migrations: ['dist/migrations/*.js'],
          synchronize: false,
          logging: config.get('NODE_ENV') === 'development',
          migrationsTableName: 'migrations_history',
        };
      },
    }),
    HealthModule,
    TracingModule,
    ObservabilityModule,
    BusinessEventsModule,
    AuditModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000, // Converte segundos para ms
          limit: config.get<number>('THROTTLE_LIMIT', 10),
        },
      ],
    }),
    RedisModule,
    AuthModule,
    UserModule,
    ProductModule,
    ChatAiModule,
    UploadModule,
    StripeModule,
    OrderModule,
    PaymentModule,
    CheckoutTrackingModule,
    DashboardModule,
    SellerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Note: Correlation ID middleware is configured in main.ts
    // TracingModule is a global module that provides the TracingService
  }
}
