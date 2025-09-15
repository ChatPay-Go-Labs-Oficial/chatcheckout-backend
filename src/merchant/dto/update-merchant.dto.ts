import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMerchantDto {
  @ApiPropertyOptional()
  display_name?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  logo_url?: string;
}