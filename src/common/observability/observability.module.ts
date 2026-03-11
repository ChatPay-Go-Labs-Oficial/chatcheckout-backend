import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckoutTrackingEvent } from '../../checkout-tracking/checkout-tracking-event.entity';
import { CheckoutTrackingSession } from '../../checkout-tracking/checkout-tracking-session.entity';
import { Order } from '../../order/order.entity';
import { CheckoutMetricsService } from './services/checkout.metrics.service';
import { PaymentMetricsService } from './services/payment.metrics.service';
import { PerformanceMetricsService } from './services/performance.metrics.service';
import { ObservabilityController } from './controllers/observability.controller';

/**
 * Observability Module
 *
 * Provides business metrics endpoints leveraging existing event tables.
 * Extends dashboard functionality with observability-specific metrics.
 *
 * Features:
 * - Checkout metrics (conversion, funnel, abandonment)
 * - Payment metrics (success rates, method breakdown)
 * - Performance metrics (response times, error rates)
 * - Time-series data for monitoring dashboards
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckoutTrackingEvent,
      CheckoutTrackingSession,
      Order,
    ]),
  ],
  controllers: [ObservabilityController],
  providers: [
    CheckoutMetricsService,
    PaymentMetricsService,
    PerformanceMetricsService,
  ],
  exports: [
    CheckoutMetricsService,
    PaymentMetricsService,
    PerformanceMetricsService,
  ],
})
export class ObservabilityModule {}
