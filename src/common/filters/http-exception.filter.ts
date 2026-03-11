import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Interface para resposta de erro padronizada
 */
export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
}

/**
 * Filtro global para capturar e padronizar todas as exceções HTTP
 *
 * @description
 * Este filtro garante que todas as respostas de erro da API sigam um padrão consistente,
 * facilitando o tratamento de erros no frontend e melhorando a experiência do desenvolvedor.
 *
 * Características:
 * - Log automático de erros
 * - Formato consistente de resposta
 * - Suporte a múltiplas mensagens de validação
 * - Tratamento especial para erros não HTTP
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor';
    let error = 'Internal Server Error';

    // Tratamento específico para HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      } else {
        message = String(exceptionResponse);
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      // Tratamento para erros genéricos
      message = exception.message;
      error = exception.name;

      // Log detalhado do erro
      this.logger.error(`Erro não capturado: ${exception.message}`, exception.stack);
    }

    // Construir resposta padronizada
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    };

    // Log do erro (não sensível)
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} - Status: ${status}`,
        JSON.stringify(errorResponse),
      );
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(
        `${request.method} ${request.url} - Status: ${status} - Message: ${
          Array.isArray(message) ? message.join(', ') : message
        }`,
      );
    }

    res.status(status).json(errorResponse);
  }
}
