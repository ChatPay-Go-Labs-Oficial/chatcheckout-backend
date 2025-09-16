import { PartialType } from '@nestjs/swagger';
import { CreateChatAiDto } from './create-chat-ai.dto';

export class UpdateChatAiDto extends PartialType(CreateChatAiDto) {}
