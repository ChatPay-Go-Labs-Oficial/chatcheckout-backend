import { Controller, Post, Body } from '@nestjs/common';
import { ChatAiService } from './chat-ai.service';
import { CreateChatAiDto } from './dto/create-chat-ai.dto';

@Controller('chat-ai')
export class ChatAiController {
  constructor(private readonly chatAiService: ChatAiService) {}

  @Post()
  create(@Body() createChatAiDto: CreateChatAiDto) {
    return this.chatAiService.message(createChatAiDto);
  }
}
