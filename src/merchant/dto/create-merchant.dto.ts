import { ApiProperty } from '@nestjs/swagger';

export class CreateMerchantDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  merchant_id: string; // CPF ou ID internacional

  @ApiProperty()
  display_name: string;

  @ApiProperty()
  logo_url: string;
}