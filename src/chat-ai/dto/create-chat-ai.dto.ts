import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateChatAiDto {
  @ApiProperty({
    example: 'Quero um resumo do conteúdo do produto',
    description: 'Mensagem enviada pelo comprador para a IA.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    example: 'a1b2c3d4e5f6',
    description: 'Hash público do produto usado no checkout.',
  })
  @IsString()
  @IsNotEmpty()
  productHash: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID único da sessão (UUID v4) para manter o contexto da conversa',
  })
  @IsUUID('4')
  @IsNotEmpty()
  sessionId: string;
}
