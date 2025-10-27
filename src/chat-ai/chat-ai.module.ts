import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatAiService } from './chat-ai.service';
import { ChatAiController } from './chat-ai.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [ChatAiController],
  providers: [ChatAiService],
})
export class ChatAiModule {}
