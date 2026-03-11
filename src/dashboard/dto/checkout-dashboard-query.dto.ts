import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CheckoutDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Filter start date (inclusive)',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter end date (inclusive)',
    example: '2026-03-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by product id',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;
}
