import { Controller, Post, Body, Logger, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatAiService } from './chat-ai.service';
import { CreateChatAiDto } from './dto/create-chat-ai.dto';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('Chat AI')
@Controller('chat-ai')
export class ChatAiController {
  private readonly logger = new Logger(ChatAiController.name);

  constructor(private readonly chatAiService: ChatAiService) {}

  @Post()
  @ApiOperation({
    summary: 'Enviar mensagem para o chat AI com streaming (acesso público via productHash)',
  })
  @ApiBody({ type: CreateChatAiDto })
  @ApiResponse({
    status: 201,
    description: 'Fluxo SSE iniciado com sucesso.',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          example: 'data: {"token":"Olá"}\n\n',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Payload inválido ou productHash inválido.' })
  async create(@Body() createChatAiDto: CreateChatAiDto, @Res() res: Response) {
    this.logger.debug('Received DTO:', JSON.stringify(createChatAiDto));

    // Configura headers para SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.chatAiService.streamMessage(createChatAiDto, res);
  }
}
