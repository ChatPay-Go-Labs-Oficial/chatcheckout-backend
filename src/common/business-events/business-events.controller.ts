import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BusinessEventsService } from './business-events.service';
import {
  AuthEventType,
  ProductEventType,
  OrderEventType,
  PaymentEventType,
  CryptoEventType,
  CheckoutTrackingEventType,
  SellerEventType,
  UserEventType,
} from './business-events.types';

/**
 * Business Events Test Controller
 *
 * Provides endpoints to test business events tracking.
 * These endpoints are useful for development and testing purposes.
 *
 * In production, business events should be triggered by actual business logic,
 * not by manually calling these test endpoints.
 */
@ApiTags('business-events')
@Controller('business-events/test')
export class BusinessEventsController {
  constructor(private readonly businessEvents: BusinessEventsService) {}

  /**
   * Check if business events tracking is enabled
   */
  @Get('status')
  @ApiOperation({
    summary: 'Check business events status',
    description: 'Returns whether business events tracking is enabled',
  })
  getStatus() {
    return {
      enabled: this.businessEvents.isTrackingEnabled(),
      message: this.businessEvents.isTrackingEnabled()
        ? 'Business events tracking is enabled'
        : 'Business events tracking is disabled',
    };
  }

  /**
   * Test authentication events
   */
  @Post('auth')
  @ApiOperation({
    summary: 'Test authentication events',
    description: 'Sends a test authentication event to Glitchtip',
  })
  testAuthEvent(@Body() body: { type?: AuthEventType; userId?: string }) {
    const type = body.type || AuthEventType.LOGIN_SUCCESS;
    this.businessEvents.trackAuthEvent(type, {
      userId: body.userId || 'test-user-123',
      email: 'test@example.com',
      method: 'password',
    });

    return {
      message: `Auth event sent: ${type}`,
      sent: this.businessEvents.isTrackingEnabled(),
    };
  }

  /**
   * Test product events
   */
  @Post('product')
  @ApiOperation({
    summary: 'Test product events',
    description: 'Sends a test product event to Glitchtip',
  })
  testProductEvent(@Body() body: { type?: ProductEventType; productId?: string }) {
    const type = body.type || ProductEventType.PRODUCT_CREATED;
    this.businessEvents.trackProductEvent(type, {
      productId: body.productId || 'test-product-123',
      sellerId: 'test-seller-456',
      productName: 'Test Product',
      price: 99.99,
      stock: 100,
    });

    return {
      message: `Product event sent: ${type}`,
      sent: this.businessEvents.isTrackingEnabled(),
    };
  }

  /**
   * Test order events
   */
  @Post('order')
  @ApiOperation({
    summary: 'Test order events',
    description: 'Sends a test order event to Glitchtip',
  })
  testOrderEvent(@Body() body: { type?: OrderEventType; orderId?: string }) {
    const type = body.type || OrderEventType.ORDER_CREATED;
    this.businessEvents.trackOrderEvent(type, {
      orderId: body.orderId || 'test-order-789',
      userId: 'test-user-123',
      sellerId: 'test-seller-456',
      total: 199.99,
      status: 'pending',
    });

    return {
      message: `Order event sent: ${type}`,
      sent: this.businessEvents.isTrackingEnabled(),
    };
  }

  /**
   * Test payment events
   */
  @Post('payment')
  @ApiOperation({
    summary: 'Test payment events',
    description: 'Sends a test payment event to Glitchtip',
  })
  testPaymentEvent(@Body() body: { type?: PaymentEventType; orderId?: string }) {
    const type = body.type || PaymentEventType.PAYMENT_SUCCESS;
    this.businessEvents.trackPaymentEvent(type, {
      orderId: body.orderId || 'test-order-789',
      userId: 'test-user-123',
      sellerId: 'test-seller-456',
      amount: 199.99,
      paymentMethod: 'pix',
      currency: 'BRL',
    });

    return {
      message: `Payment event sent: ${type}`,
      sent: this.businessEvents.isTrackingEnabled(),
    };
  }

  /**
   * Test crypto transaction events
   */
  @Post('crypto')
  @ApiOperation({
    summary: 'Test crypto transaction events',
    description: 'Sends a test crypto transaction event to Glitchtip',
  })
  testCryptoEvent(@Body() body: { type?: CryptoEventType; transactionId?: string }) {
    const type = body.type || CryptoEventType.TRANSACTION_CREATED;
    this.businessEvents.trackCryptoEvent(type, {
      transactionId: body.transactionId || 'test-tx-abc123',
      orderId: 'test-order-789',
      userId: 'test-user-123',
      sellerId: 'test-seller-456',
      buyerWallet: 'GABC...XYZ',
      sellerWallet: 'GDEF...UVW',
      amountToken: '100.0000000',
      amountFiat: '199.99',
      tokenSymbol: 'USDC',
      planType: 'STARTER',
      network: 'stellar',
    });

    return {
      message: `Crypto event sent: ${type}`,
      sent: this.businessEvents.isTrackingEnabled(),
    };
  }

  /**
   * Test checkout events
   */
  @Post('checkout')
  @ApiOperation({
    summary: 'Test checkout tracking events',
    description: 'Sends a test checkout tracking event to Glitchtip',
  })
  testCheckoutEvent(@Body() body: { type?: CheckoutTrackingEventType; sessionId?: string }) {
    const type = body.type || CheckoutTrackingEventType.SESSION_STARTED;
    this.businessEvents.trackCheckoutEvent(type, {
      sessionId: body.sessionId || 'test-session-xyz',
      sellerId: 'test-seller-456',
      productId: 'test-product-123',
      step: 'customer_data',
    });

    return {
      message: `Checkout event sent: ${type}`,
      sent: this.businessEvents.isTrackingEnabled(),
    };
  }

  /**
   * Test seller events
   */
  @Post('seller')
  @ApiOperation({
    summary: 'Test seller events',
    description: 'Sends a test seller event to Glitchtip',
  })
  testSellerEvent(@Body() body: { type?: SellerEventType; sellerId?: string }) {
    const type = body.type || SellerEventType.SELLER_REGISTERED;
    this.businessEvents.trackSellerEvent(type, {
      sellerId: body.sellerId || 'test-seller-456',
      userId: 'test-user-123',
    });

    return {
      message: `Seller event sent: ${type}`,
      sent: this.businessEvents.isTrackingEnabled(),
    };
  }

  /**
   * Test user events
   */
  @Post('user')
  @ApiOperation({
    summary: 'Test user events',
    description: 'Sends a test user event to Glitchtip',
  })
  testUserEvent(@Body() body: { type?: UserEventType; userId?: string }) {
    const type = body.type || UserEventType.USER_CREATED;
    this.businessEvents.trackUserEvent(type, {
      userId: body.userId || 'test-user-123',
      email: 'test@example.com',
      role: 'seller',
    });

    return {
      message: `User event sent: ${type}`,
      sent: this.businessEvents.isTrackingEnabled(),
    };
  }

  /**
   * Test all event types
   */
  @Post('all')
  @ApiOperation({
    summary: 'Test all business event types',
    description: 'Sends one of each type of business event to Glitchtip',
  })
  testAllEvents() {
    // Auth
    this.businessEvents.trackAuthEvent(AuthEventType.LOGIN_SUCCESS, {
      userId: 'test-user-123',
      email: 'test@example.com',
      method: 'password',
    });

    // Product
    this.businessEvents.trackProductEvent(ProductEventType.PRODUCT_CREATED, {
      productId: 'test-product-123',
      sellerId: 'test-seller-456',
      productName: 'Test Product',
      price: 99.99,
    });

    // Order
    this.businessEvents.trackOrderEvent(OrderEventType.ORDER_CREATED, {
      orderId: 'test-order-789',
      userId: 'test-user-123',
      sellerId: 'test-seller-456',
      total: 199.99,
    });

    // Payment
    this.businessEvents.trackPaymentEvent(PaymentEventType.PAYMENT_SUCCESS, {
      orderId: 'test-order-789',
      userId: 'test-user-123',
      amount: 199.99,
      paymentMethod: 'pix',
    });

    // Crypto
    this.businessEvents.trackCryptoEvent(CryptoEventType.TRANSACTION_CREATED, {
      transactionId: 'test-tx-abc123',
      orderId: 'test-order-789',
      amountToken: '100.0000000',
      amountFiat: '199.99',
      tokenSymbol: 'USDC',
      network: 'stellar',
    });

    // Checkout
    this.businessEvents.trackCheckoutEvent(CheckoutTrackingEventType.SESSION_STARTED, {
      sessionId: 'test-session-xyz',
      sellerId: 'test-seller-456',
      productId: 'test-product-123',
    });

    return {
      message: 'All business events sent to Glitchtip',
      sent: this.businessEvents.isTrackingEnabled(),
      events: [
        'auth.login.success',
        'product.created',
        'order.created',
        'payment.success',
        'crypto.transaction.created',
        'checkout.session.started',
      ],
    };
  }
}
