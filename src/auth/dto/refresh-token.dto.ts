import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de refresh válido para renovar o access token',
  })
  @IsNotEmpty({ message: 'Token de refresh é obrigatório' })
  @IsString({ message: 'Token de refresh deve ser uma string' })
  @Transform(({ value }: { value: string }) => value.trim()) // Remove espaços no início e fim
  refresh_token: string;
}
