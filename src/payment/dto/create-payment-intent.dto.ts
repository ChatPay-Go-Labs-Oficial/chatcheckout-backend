import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CustomerDataDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'joao@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '12345678900' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: '11999999999' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'The ID of the product to purchase',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Payment method',
    enum: ['pix', 'card', 'crypto'],
    example: 'pix',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethod: 'pix' | 'card' | 'crypto';

  @ApiProperty({
    description: 'Customer data',
    type: CustomerDataDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => CustomerDataDto)
  customerData: CustomerDataDto;
}
