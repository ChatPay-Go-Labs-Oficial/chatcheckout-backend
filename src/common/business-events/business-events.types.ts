/**
 * Business Events Types
 *
 * Defines all business event types for monitoring and analytics.
 * Events are sent to Glitchtip/Sentry for real-time monitoring.
 */

/**
 * Main business event categories
 */
export enum BusinessEventCategory {
  // Authentication & Authorization
  AUTH = 'auth',

  // Product & Catalog
  PRODUCT = 'product',

  // Orders & Checkout
  ORDER = 'order',

  // Payments
  PAYMENT = 'payment',

  // Crypto Transactions
  CRYPTO = 'crypto',

  // Checkout Tracking
  CHECKOUT_TRACKING = 'checkout_tracking',

  // Seller Operations
  SELLER = 'seller',

  // User Operations
  USER = 'user',
}

/**
 * Authentication event types
 */
export enum AuthEventType {
  // Successful events
  LOGIN_SUCCESS = 'login.success',
  LOGOUT_SUCCESS = 'logout.success',
  REGISTER_SUCCESS = 'register.success',
  PASSWORD_RESET_SUCCESS = 'password_reset.success',
  TOKEN_REFRESHED = 'token.refreshed',

  // Failed events
  LOGIN_FAILED = 'login.failed',
  LOGOUT_FAILED = 'logout.failed',
  REGISTER_FAILED = 'register.failed',
  PASSWORD_RESET_FAILED = 'password_reset.failed',
  TOKEN_REFRESH_FAILED = 'token.refresh_failed',

  // Security events
  SUSPICIOUS_ACTIVITY = 'suspicious.activity',
  MULTIPLE_FAILED_ATTEMPTS = 'multiple_failed_attempts',
  ACCOUNT_LOCKED = 'account.locked',
  ACCOUNT_UNLOCKED = 'account.unlocked',
}

/**
 * Product event types
 */
export enum ProductEventType {
  // Product lifecycle
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',

  // Product visibility
  PRODUCT_PUBLISHED = 'product.published',
  PRODUCT_UNPUBLISHED = 'product.unpublished',

  // Product engagement
  PRODUCT_VIEWED = 'product.viewed',
  PRODUCT_SHARED = 'product.shared',

  // Inventory
  PRODUCT_OUT_OF_STOCK = 'product.out_of_stock',
  PRODUCT_LOW_STOCK = 'product.low_stock',
  PRODUCT_BACK_IN_STOCK = 'product.back_in_stock',
}

/**
 * Order event types
 */
export enum OrderEventType {
  // Order lifecycle
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_CANCELLED = 'order.cancelled',

  // Order fulfillment
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_PROCESSING = 'order.processing',
  ORDER_COMPLETED = 'order.completed',

  // Order status changes
  ORDER_STATUS_CHANGED = 'order.status_changed',
}

/**
 * Payment event types
 */
export enum PaymentEventType {
  // Payment lifecycle
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_PROCESSING = 'payment.processing',
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',

  // Payment methods
  PIX_PAYMENT_INITIATED = 'pix.initiated',
  PIX_PAYMENT_SUCCESS = 'pix.success',
  PIX_PAYMENT_FAILED = 'pix.failed',

  CARD_PAYMENT_INITIATED = 'card.initiated',
  CARD_PAYMENT_SUCCESS = 'card.success',
  CARD_PAYMENT_FAILED = 'card.failed',

  CRYPTO_PAYMENT_INITIATED = 'crypto.initiated',
  CRYPTO_PAYMENT_SUCCESS = 'crypto.success',
  CRYPTO_PAYMENT_FAILED = 'crypto.failed',

  // Refunds
  REFUND_INITIATED = 'refund.initiated',
  REFUND_SUCCESS = 'refund.success',
  REFUND_FAILED = 'refund.failed',
}

/**
 * Crypto transaction event types
 */
export enum CryptoEventType {
  // Transaction lifecycle
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_PENDING = 'transaction.pending',
  TRANSACTION_COMPLETED = 'transaction.completed',
  TRANSACTION_FAILED = 'transaction.failed',

  // Blockchain events
  TRANSACTION_SUBMITTED_TO_BLOCKCHAIN = 'transaction.submitted_to_blockchain',
  TRANSACTION_CONFIRMED_ON_BLOCKCHAIN = 'transaction.confirmed_on_blockchain',
  TRANSACTION_UNLOCKED = 'transaction.unlocked',

  // Payment plans
  STARTER_PLAN_SELECTED = 'plan.starter_selected',
  ELITE_PLAN_SELECTED = 'plan.elite_selected',

  // Wallet events
  WALLET_CONNECTED = 'wallet.connected',
  WALLET_DISCONNECTED = 'wallet.disconnected',
  WALLET_BALANCE_INSUFFICIENT = 'wallet.balance_insufficient',
}

/**
 * Checkout tracking event types
 */
export enum CheckoutTrackingEventType {
  // Session lifecycle
  SESSION_STARTED = 'session.started',
  SESSION_UPDATED = 'session.updated',
  SESSION_EXPIRED = 'session.expired',
  SESSION_ABANDONED = 'session.abandoned',
  SESSION_COMPLETED = 'session.completed',

  // Checkout steps
  CHECKOUT_STARTED = 'checkout.started',
  CUSTOMER_DATA_SUBMITTED = 'customer_data.submitted',
  PAYMENT_METHOD_SELECTED = 'payment_method.selected',
  PAYMENT_CONFIRM_CLICKED = 'payment_confirm.clicked',

  // Abandonment
  CHECKOUT_ABANDONED_AT_STEP = 'checkout.abandoned_at_step',
}

/**
 * Seller event types
 */
export enum SellerEventType {
  // Seller lifecycle
  SELLER_REGISTERED = 'seller.registered',
  SELLER_APPROVED = 'seller.approved',
  SELLER_SUSPENDED = 'seller.suspended',
  SELLER_REACTIVATED = 'seller.reactivated',

  // Seller metrics
  SELLER_FIRST_SALE = 'seller.first_sale',
  SELLER_MILESTONE_REACHED = 'seller.milestone_reached',
  SELLER_PAYOUT_PROCESSED = 'seller.payout_processed',
}

/**
 * User event types
 */
export enum UserEventType {
  // User lifecycle
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',

  // User activity
  USER_LAST_SEEN = 'user.last_seen',
  USER_BECAME_ACTIVE = 'user.became_active',
  USER_BECAME_INACTIVE = 'user.became_inactive',
}

/**
 * Business event interface
 */
export interface BusinessEvent {
  // Event identification
  category: BusinessEventCategory;
  type: string;
  name: string;

  // Event data
  data?: Record<string, unknown>;

  // Context
  userId?: string;
  sellerId?: string;
  orderId?: string;
  productId?: string;
  sessionId?: string;
  transactionId?: string;

  // Metadata
  timestamp: Date;
  environment: string;
  correlationId?: string;

  // Metrics
  metrics?: {
    duration?: number; // Duration in milliseconds
    amount?: number; // Monetary value
    count?: number; // Item count
    [key: string]: number | undefined;
  };

  // Tags for filtering
  tags?: Record<string, string>;
}

/**
 * Event severity levels
 */
export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Business event result (success/failure)
 */
export enum EventResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending',
}
