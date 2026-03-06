import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  CheckoutEventPaymentMethod,
  CheckoutEventStep,
  CheckoutEventType,
} from '../checkout-tracking.enums';

export class TrackCheckoutEventDto {
  @ApiProperty({ description: 'Tracking session id', format: 'uuid' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ enum: CheckoutEventType })
  @IsEnum(CheckoutEventType)
  eventType: CheckoutEventType;

  @ApiPropertyOptional({ enum: CheckoutEventStep })
  @IsOptional()
  @IsEnum(CheckoutEventStep)
  step?: CheckoutEventStep;

  @ApiPropertyOptional({ enum: CheckoutEventPaymentMethod })
  @IsOptional()
  @IsEnum(CheckoutEventPaymentMethod)
  paymentMethod?: CheckoutEventPaymentMethod;

  @ApiPropertyOptional({ description: 'Associated order id', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'External status label',
    example: 'succeeded',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional({
    description: 'Client-side timestamp in ISO 8601',
    example: '2026-03-03T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata (sanitized by backend)',
    example: { checkoutStep: 'payment-review', network: 'stellar' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
