import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMerchantDto {
  @ApiPropertyOptional()
  merchant_id?: string;

  @ApiPropertyOptional()
  display_name?: string;

  @ApiPropertyOptional()
  logo_url?: string;
}
