import { ApiProperty } from '@nestjs/swagger';

export class CreateMerchantDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  logo_url: string;
}
