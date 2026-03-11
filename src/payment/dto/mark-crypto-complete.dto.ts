import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MarkCryptoCompleteDto {
  @ApiProperty({ example: 'crypto_16d40c27-7967-4ca8-9e1e-7874be6e1453' })
  @IsString()
  @IsNotEmpty()
  orderRef: string;

  @ApiProperty({
    example: 'cb95fa98cf9c8d4f61d4eac6c4f13c14a7f053a2d9ff08fe9a4d2f3125fdfc6e',
  })
  @IsString()
  @IsNotEmpty()
  blockchainHash: string;
}
