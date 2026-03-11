import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../product.entity';
import { IsNotEmpty, IsNumber, IsPositive, IsEnum, IsString, IsUrl } from 'class-validator';

export class CreateProductDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  promptAi: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUrl()
  salesPageUrl: string;
}
