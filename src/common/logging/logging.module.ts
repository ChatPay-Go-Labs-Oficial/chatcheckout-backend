import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { pinoLoggerConfig } from './pino-logger.config';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  RequestLogger,
  AppLogger,
} from './decorators/logger.decorator';

/**
 * Global Logging Module
 *
 * Configures structured logging throughout the application using nestjs-pino.
 * This module is global and doesn't need to be imported in other modules.
 *
 * Features:
 * - Structured JSON logs for production (Railway)
 * - Pretty-printed logs for development
 * - Automatic request ID generation
 * - Business context inclusion (userId, sellerId, etc.)
 * - Sensitive data redaction
 */
@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: pinoLoggerConfig,
    }),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    RequestLogger,
  ],
  exports: [LoggerModule, RequestLogger],
})
export class LoggingModule {}
