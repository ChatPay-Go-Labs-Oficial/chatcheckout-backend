import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

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
}
