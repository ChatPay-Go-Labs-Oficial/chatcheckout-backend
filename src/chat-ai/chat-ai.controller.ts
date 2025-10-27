import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ChatAiService } from './chat-ai.service';
import { CreateChatAiDto } from './dto/create-chat-ai.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Chat AI')
@Controller('chat-ai')
export class ChatAiController {
  constructor(private readonly chatAiService: ChatAiService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enviar mensagem para o chat AI' })
  create(@Body() createChatAiDto: CreateChatAiDto) {
    return this.chatAiService.message(createChatAiDto);
  }
}
