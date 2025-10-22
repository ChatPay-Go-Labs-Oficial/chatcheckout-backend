import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar ValidationPipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades não decoradas do DTO
      forbidNonWhitelisted: true, // Rejeita propriedades não decoradas
      transform: true, // Transforma automaticamente os tipos
      transformOptions: {
        enableImplicitConversion: true, // Converte tipos automaticamente
      },
      errorHttpStatusCode: 400, // Status code para erros de validação
    }),
  );

  // Configurar ClassSerializerInterceptor global para excluir campos com @Exclude()
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Configurar CORS
  app.enableCors(); // Permitir todas as origens

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('ChatCheckout API')
    .setDescription('API do ChatCheckout - Plataforma de e-commerce conversacional')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 3000);
}

void bootstrap();
