import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de refresh válido para renovar o access token',
  })
  @IsNotEmpty({ message: 'Token de refresh é obrigatório' })
  @IsString({ message: 'Token de refresh deve ser uma string' })
  refresh_token: string;
}
