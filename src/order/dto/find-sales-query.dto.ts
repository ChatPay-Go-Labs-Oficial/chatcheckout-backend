import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum SalesPaymentType {
  PIX = 'PIX',
  CARD = 'CARD',
  CRYPTO = 'CRYPTO',
}

export enum SalesSortBy {
  CREATED_AT = 'createdAt',
  TOTAL_AMOUNT = 'totalAmount',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class FindSalesQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by payment type',
    enum: SalesPaymentType,
    example: SalesPaymentType.PIX,
  })
  @IsOptional()
  @IsEnum(SalesPaymentType)
  paymentType?: SalesPaymentType;

  @ApiPropertyOptional({
    description: 'Filter sales created at or after this date-time (ISO 8601)',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter sales created at or before this date-time (ISO 8601)',
    example: '2026-03-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: SalesSortBy,
    default: SalesSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SalesSortBy)
  sortBy?: SalesSortBy = SalesSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
