import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import {
  BusinessEvent,
  BusinessEventCategory,
  AuthEventType,
  ProductEventType,
  OrderEventType,
  PaymentEventType,
  CryptoEventType,
  CheckoutTrackingEventType,
  SellerEventType,
  UserEventType,
  EventSeverity,
  EventResult,
} from './business-events.types';

/**
 * Business Events Service
 *
 * Tracks important business events and logs them in a structured way.
 * These logs are formatted by Pino and sent to output/Loki.
 *
 * Events are categorized and can be filtered by:
 * - Category (auth, product, order, payment, crypto, etc.)
 * - Type (login.success, product.created, etc.)
 * - User/Seller/Order/Product IDs
 * - Result (success/failure/pending)
 * - Severity (info/warning/error/critical)
 *
 * Usage:
 * ```typescript
 * constructor(private businessEvents: BusinessEventsService) {}
 *
 * // Track successful login
 * this.businessEvents.trackAuthEvent(AuthEventType.LOGIN_SUCCESS, {
 *   userId: user.id,
 *   method: 'password',
 * });
 *
 * // Track product creation
 * this.businessEvents.trackProductEvent(ProductEventType.PRODUCT_CREATED, {
 *   productId: product.id,
 *   sellerId: product.sellerId,
 *   data: { name: product.name, price: product.price },
 * });
 * ```
 */
@Injectable()
export class BusinessEventsService {
  private readonly logger = new Logger(BusinessEventsService.name);
  private readonly isEnabled: boolean;
  private readonly environment: string;

  constructor(
    @Optional() private readonly configService?: ConfigService,
  ) {
    this.isEnabled = this.configService?.get('BUSINESS_EVENTS_ENABLED', 'true') === 'true';
    this.environment = this.configService?.get('NODE_ENV') || 'development';
  }

  /**
   * Check if business events tracking is enabled
   */
  private checkIfEnabled(): boolean {
    return this.configService?.get('BUSINESS_EVENTS_ENABLED', 'true') === 'true';
  }

  /**
   * Track a business event
   */
  private trackEvent(event: BusinessEvent): void {
    if (!this.isEnabled) {
      return;
    }

    // Build structured log message
    const businessContext: Record<string, string> = {};
    if (event.sellerId) businessContext.sellerId = event.sellerId;
    if (event.orderId) businessContext.orderId = event.orderId;
    if (event.productId) businessContext.productId = event.productId;
    if (event.sessionId) businessContext.sessionId = event.sessionId;
    if (event.transactionId) businessContext.transactionId = event.transactionId;
    if (event.correlationId) businessContext.correlationId = event.correlationId;

    const logData = {
      business_event: {
        category: event.category,
        type: event.type,
        name: event.name,
        result: event.tags?.result || EventResult.SUCCESS,
        severity: event.tags?.severity || EventSeverity.INFO,
        timestamp: event.timestamp.toISOString(),
      },
      user_id: event.userId,
      business_context: businessContext,
      event_tags: event.tags,
      metrics: event.metrics,
      event_data: event.data,
      environment: event.environment,
    };

    const message = `[${event.category}] ${event.name}${event.tags?.result ? ` - ${event.tags.result}` : ''}`;
    const severity = event.tags?.severity || EventSeverity.INFO;

    if (severity === EventSeverity.ERROR || severity === EventSeverity.CRITICAL) {
      this.logger.error(message, undefined, undefined, logData);
    } else if (severity === EventSeverity.WARNING) {
      this.logger.warn(message, logData);
    } else {
      this.logger.log(message, logData);
    }
  }

  /**
   * Track authentication event
   */
  trackAuthEvent(
    type: AuthEventType,
    options: {
      userId?: string;
      email?: string;
      method?: string;
      ip?: string;
      userAgent?: string;
      failureReason?: string;
      data?: Record<string, unknown>;
    } = {},
  ): void {
    const isFailure = type.includes('failed');
    const isSuspicious = type === AuthEventType.SUSPICIOUS_ACTIVITY ||
                        type === AuthEventType.MULTIPLE_FAILED_ATTEMPTS;

    this.trackEvent({
      category: BusinessEventCategory.AUTH,
      type,
      name: `Auth: ${type}`,
      userId: options.userId,
      data: {
        email: options.email,
        method: options.method,
        failureReason: options.failureReason,
        ...options.data,
      },
      timestamp: new Date(),
      environment: this.environment,
      tags: {
        result: isFailure ? EventResult.FAILURE : EventResult.SUCCESS,
        severity: isSuspicious ? EventSeverity.WARNING :
                isFailure ? EventSeverity.INFO :
                EventSeverity.INFO,
        method: options.method || 'unknown',
      },
    });
  }

  /**
   * Track product event
   */
  trackProductEvent(
    type: ProductEventType,
    options: {
      productId?: string;
      sellerId?: string;
      productName?: string;
      price?: number;
      stock?: number;
      data?: Record<string, unknown>;
    } = {},
  ): void {
    const isFailure = type === ProductEventType.PRODUCT_OUT_OF_STOCK;

    this.trackEvent({
      category: BusinessEventCategory.PRODUCT,
      type,
      name: `Product: ${type}`,
      productId: options.productId,
      sellerId: options.sellerId,
      data: {
        productName: options.productName,
        price: options.price,
        stock: options.stock,
        ...options.data,
      },
      timestamp: new Date(),
      environment: this.environment,
      metrics: {
        amount: options.price,
        count: options.stock,
      },
      tags: {
        result: isFailure ? EventResult.FAILURE : EventResult.SUCCESS,
        severity: isFailure ? EventSeverity.WARNING : EventSeverity.INFO,
      },
    });
  }

  /**
   * Track order event
   */
  trackOrderEvent(
    type: OrderEventType,
    options: {
      orderId?: string;
      userId?: string;
      sellerId?: string;
      total?: number;
      status?: string;
      previousStatus?: string;
      data?: Record<string, unknown>;
    } = {},
  ): void {
    const isCancellation = type === OrderEventType.ORDER_CANCELLED;

    this.trackEvent({
      category: BusinessEventCategory.ORDER,
      type,
      name: `Order: ${type}`,
      orderId: options.orderId,
      userId: options.userId,
      sellerId: options.sellerId,
      data: {
        status: options.status,
        previousStatus: options.previousStatus,
        ...options.data,
      },
      timestamp: new Date(),
      environment: this.environment,
      metrics: {
        amount: options.total,
      },
      tags: {
        result: EventResult.SUCCESS,
        severity: isCancellation ? EventSeverity.WARNING : EventSeverity.INFO,
        status: options.status || 'unknown',
      },
    });
  }

  /**
   * Track payment event
   */
  trackPaymentEvent(
    type: PaymentEventType,
    options: {
      orderId?: string;
      userId?: string;
      sellerId?: string;
      amount?: number;
      paymentMethod?: string;
      currency?: string;
      failureReason?: string;
      data?: Record<string, unknown>;
    } = {},
  ): void {
    const isFailure = type.includes('failed');
    const isSuccess = type.includes('success');

    this.trackEvent({
      category: BusinessEventCategory.PAYMENT,
      type,
      name: `Payment: ${type}`,
      orderId: options.orderId,
      userId: options.userId,
      sellerId: options.sellerId,
      data: {
        paymentMethod: options.paymentMethod,
        currency: options.currency,
        failureReason: options.failureReason,
        ...options.data,
      },
      timestamp: new Date(),
      environment: this.environment,
      metrics: {
        amount: options.amount,
      },
      tags: {
        result: isSuccess ? EventResult.SUCCESS :
                isFailure ? EventResult.FAILURE :
                EventResult.PENDING,
        severity: isFailure ? EventSeverity.ERROR :
                isSuccess ? EventSeverity.INFO :
                EventSeverity.INFO,
        payment_method: options.paymentMethod || 'unknown',
        currency: options.currency || 'BRL',
      },
    });
  }

  /**
   * Track crypto transaction event
   */
  trackCryptoEvent(
    type: CryptoEventType,
    options: {
      transactionId?: string;
      orderId?: string;
      userId?: string;
      sellerId?: string;
      buyerWallet?: string;
      sellerWallet?: string;
      amountToken?: string;
      amountFiat?: string;
      tokenSymbol?: string;
      planType?: string;
      network?: string;
      blockchainHash?: string;
      failureReason?: string;
      data?: Record<string, unknown>;
    } = {},
  ): void {
    const isFailure = type.includes('failed');
    const isSuccess = type.includes('completed') || type.includes('confirmed') || type.includes('unlocked');

    this.trackEvent({
      category: BusinessEventCategory.CRYPTO,
      type,
      name: `Crypto: ${type}`,
      transactionId: options.transactionId,
      orderId: options.orderId,
      userId: options.userId,
      sellerId: options.sellerId,
      data: {
        buyerWallet: options.buyerWallet,
        sellerWallet: options.sellerWallet,
        tokenSymbol: options.tokenSymbol,
        planType: options.planType,
        network: options.network,
        blockchainHash: options.blockchainHash,
        failureReason: options.failureReason,
        ...options.data,
      },
      timestamp: new Date(),
      environment: this.environment,
      metrics: {
        amount: options.amountFiat ? parseFloat(options.amountFiat) : undefined,
      },
      tags: {
        result: isSuccess ? EventResult.SUCCESS :
                isFailure ? EventResult.FAILURE :
                EventResult.PENDING,
        severity: isFailure ? EventSeverity.ERROR :
                isSuccess ? EventSeverity.INFO :
                EventSeverity.INFO,
        token_symbol: options.tokenSymbol || 'unknown',
        plan_type: options.planType || 'unknown',
        network: options.network || 'unknown',
      },
    });
  }

  /**
   * Track checkout session event
   */
  trackCheckoutEvent(
    type: CheckoutTrackingEventType,
    options: {
      sessionId?: string;
      sellerId?: string;
      productId?: string;
      userId?: string;
      orderId?: string;
      step?: string;
      abandonmentReason?: string;
      duration?: number;
      data?: Record<string, unknown>;
    } = {},
  ): void {
    const isAbandonment = type.includes('abandoned');

    this.trackEvent({
      category: BusinessEventCategory.CHECKOUT_TRACKING,
      type,
      name: `Checkout: ${type}`,
      sessionId: options.sessionId,
      sellerId: options.sellerId,
      productId: options.productId,
      userId: options.userId,
      orderId: options.orderId,
      data: {
        step: options.step,
        abandonmentReason: options.abandonmentReason,
        ...options.data,
      },
      timestamp: new Date(),
      environment: this.environment,
      metrics: {
        duration: options.duration,
      },
      tags: {
        result: isAbandonment ? EventResult.FAILURE : EventResult.SUCCESS,
        severity: isAbandonment ? EventSeverity.WARNING : EventSeverity.INFO,
        step: options.step || 'unknown',
      },
    });
  }

  /**
   * Track seller event
   */
  trackSellerEvent(
    type: SellerEventType,
    options: {
      sellerId?: string;
      userId?: string;
      milestone?: string;
      amount?: number;
      data?: Record<string, unknown>;
    } = {},
  ): void {
    this.trackEvent({
      category: BusinessEventCategory.SELLER,
      type,
      name: `Seller: ${type}`,
      sellerId: options.sellerId,
      userId: options.userId,
      data: {
        milestone: options.milestone,
        ...options.data,
      },
      timestamp: new Date(),
      environment: this.environment,
      metrics: {
        amount: options.amount,
      },
      tags: {
        result: EventResult.SUCCESS,
        severity: EventSeverity.INFO,
      },
    });
  }

  /**
   * Track user event
   */
  trackUserEvent(
    type: UserEventType,
    options: {
      userId?: string;
      email?: string;
      role?: string;
      data?: Record<string, unknown>;
    } = {},
  ): void {
    this.trackEvent({
      category: BusinessEventCategory.USER,
      type,
      name: `User: ${type}`,
      userId: options.userId,
      data: {
        email: options.email,
        role: options.role,
        ...options.data,
      },
      timestamp: new Date(),
      environment: this.environment,
      tags: {
        result: EventResult.SUCCESS,
        severity: EventSeverity.INFO,
        role: options.role || 'unknown',
      },
    });
  }

  /**
   * Set request context from Express request
   * Extracts correlation ID and user info for event enrichment
   * 
   * @deprecated Pino and OpenTelemetry correctly extract this logic automatically.
   */
  setRequestContext(request: Request): void {
    // Left intentionally blank as Pino and OpenTelemetry are handling this automatically now.
  }

  /**
   * Check if business events tracking is enabled
   */
  isTrackingEnabled(): boolean {
    return this.isEnabled;
  }
}
