import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatAiService } from './chat-ai.service';
import { ChatAiController } from './chat-ai.controller';

@Module({
  imports: [HttpModule],
  controllers: [ChatAiController],
  providers: [ChatAiService],
})
export class ChatAiModule {}
