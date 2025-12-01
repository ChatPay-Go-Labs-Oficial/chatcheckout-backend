import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsHexadecimal, MinLength } from 'class-validator';

export class DecodeHashParamsDto {
  @ApiProperty({
    description:
      'Encrypted hash string (hexadecimal) used to identify and decrypt product information. Contains IV (32 chars) + encrypted data.',
    example: 'a1b2c3d4e5f67890abcdef1234567890fedcba0987654321...',
  })
  @IsNotEmpty()
  @IsHexadecimal()
  @MinLength(64) // Mínimo: 32 chars (IV) + 32 chars (dados mínimos)
  hash: string;
}
