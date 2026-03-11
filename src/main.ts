import './otel-setup.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
/**
 * Bootstrap the ChatCheckout Backend application
 *
 * Configures:
 * - Structured logging (Pino)
 * - Distributed tracing (correlation IDs)
 * - Global exception filters
 * - Validation pipes
 * - CORS
 * - Swagger API documentation
 */
async function bootstrap() {
  // Create application with raw body support for Stripe webhooks
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true, // Enable log buffering for better performance
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Log environment information
  logger.log(`Starting in ${configService.get('NODE_ENV', 'development')} mode`);
  logger.log(`Log level: ${configService.get('LOG_LEVEL', 'info')}`);
  logger.log(`Log format: ${configService.get('LOG_FORMAT', 'json')}`);
  const tracesEnabled = process.env.TRACES_ENABLED === 'true' || process.env.NODE_ENV === 'production';
  logger.log(`Tracing enabled: ${tracesEnabled}`);

  // Configure global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Configure global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      errorHttpStatusCode: 400,
    }),
  );

  // Configure global serialization interceptor
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Enable CORS for all origins
  app.enableCors();

  // Configure Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('ChatCheckout API')
    .setDescription('API do ChatCheckout - Plataforma de e-commerce conversacional')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('observability', 'Health and metrics endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Start listening
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}

void bootstrap();
