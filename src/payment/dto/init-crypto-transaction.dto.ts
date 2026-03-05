import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';
import { TokenSymbol } from '../crypto-transaction.entity';

export class InitCryptoTransactionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: 'CA7KSUEHPBPOY2Z253B5IFY6E6H6JYQ5VL5GEUXLIYRDTX4PTSFMSVKV',
    description: 'Buyer wallet address (Stellar account or smart-account)',
  })
  @IsString()
  @IsNotEmpty()
  buyerWallet: string;

  @ApiProperty({ enum: TokenSymbol, example: TokenSymbol.USDC })
  @IsEnum(TokenSymbol)
  tokenSymbol: TokenSymbol;

  @ApiProperty({ example: '12.34567890', description: 'Amount in token units' })
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message: 'amountToken must be a decimal string with up to 8 decimal places',
  })
  amountToken: string;

  @ApiProperty({ example: '99.90', description: 'Amount in BRL (fiat)' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'amountFiat must be a decimal string with up to 2 decimal places',
  })
  amountFiat: string;

  @ApiProperty({ example: 'testnet', description: 'Stellar network identifier' })
  @IsString()
  @IsNotEmpty()
  network: string;
}
