import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsHexadecimal } from 'class-validator';

export class DecodeHashParamsDto {
  @ApiProperty({
    description: 'Hexadecimal hash string used to identify and decrypt product information',
    example: '1a2b3c4d5e6f7g8h9i0j',
  })
  @IsNotEmpty()
  @IsHexadecimal()
  hash: string;
}
