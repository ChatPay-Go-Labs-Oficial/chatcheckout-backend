import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../product.entity';
import { IsOptional, IsNotEmpty, IsNumber, IsPositive, IsEnum, IsString } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  merchantId?: string;
}