import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BusinessEventsService } from './business-events.service';
import { BusinessEventsController } from './business-events.controller';

/**
 * Business Events Module
 *
 * Global module for tracking business events across the application.
 * Events are logged and processed in real-time.
 *
 * Features:
 * - Authentication events (login, logout, registration, etc.)
 * - Product events (created, updated, deleted, viewed, etc.)
 * - Order events (created, confirmed, completed, cancelled, etc.)
 * - Payment events (initiated, success, failed, by method)
 * - Crypto transaction events (created, pending, completed, failed, blockchain events)
 * - Checkout tracking events (session started, abandoned, completed, etc.)
 * - Seller events (registered, first sale, milestones, payouts)
 * - User events (created, updated, activity)
 *
 * Environment Variables:
 * - BUSINESS_EVENTS_ENABLED: Enable/disable business events (true/false)
 *
 * Usage:
 * ```typescript
 * import { BusinessEventsService } from '@/common/business-events';
 *
 * constructor(private businessEvents: BusinessEventsService) {}
 *
 * // Track login success
 * this.businessEvents.trackAuthEvent(AuthEventType.LOGIN_SUCCESS, {
 *   userId: user.id,
 *   method: 'password',
 * });
 *
 * // Track product creation
 * this.businessEvents.trackProductEvent(ProductEventType.PRODUCT_CREATED, {
 *   productId: product.id,
 *   sellerId: product.sellerId,
 *   productName: product.name,
 *   price: product.price,
 * });
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [BusinessEventsController],
  providers: [BusinessEventsService],
  exports: [BusinessEventsService],
})
export class BusinessEventsModule {}
