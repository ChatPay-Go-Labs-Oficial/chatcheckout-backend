import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { Order, OrderStatus, PaymentMethod } from '../order/order.entity';
import { StripeService } from '../stripe/stripe.service';
import {
  StripeTransaction,
  StripeTransactionStatus,
  StripePaymentMethodType,
} from './stripe-transaction.entity';
import { SellerLedgerEntry, SellerLedgerEntryType } from './seller-ledger-entry.entity';
import { CryptoTransaction, CryptoTransactionStatus, TokenSymbol } from './crypto-transaction.entity';
import { CheckoutTrackingService } from '../checkout-tracking/checkout-tracking.service';
import { CheckoutEventPaymentMethod, CheckoutEventType } from '../checkout-tracking/checkout-tracking.enums';
import { InitCryptoTransactionDto } from './dto/init-crypto-transaction.dto';
import { MarkCryptoSubmittedDto } from './dto/mark-crypto-submitted.dto';
import { MarkCryptoCompleteDto } from './dto/mark-crypto-complete.dto';
import { MarkCryptoFailedDto } from './dto/mark-crypto-failed.dto';
import { BusinessEventsService, CryptoEventType, PaymentEventType } from '../common/business-events';
import { OrderService } from '../order/order.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(StripeTransaction)
    private stripeTransactionRepository: Repository<StripeTransaction>,
    @InjectRepository(CryptoTransaction)
    private cryptoTransactionRepository: Repository<CryptoTransaction>,
    @InjectRepository(SellerLedgerEntry)
    private sellerLedgerRepository: Repository<SellerLedgerEntry>,
    private stripeService: StripeService,
    private checkoutTrackingService: CheckoutTrackingService,
    private businessEvents: BusinessEventsService,
    private orderService: OrderService,
  ) {}

  async createAccountSession(userId: string): Promise<{ clientSecret: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let accountId = user.stripeAccountId;

    if (!accountId) {
      const account = await this.stripeService.createAccount(user.email);
      accountId = account.id;
      user.stripeAccountId = accountId;
      await this.userRepository.save(user);
    }

    const clientSecret = await this.stripeService.createAccountSession(accountId);
    return { clientSecret };
  }

  async createPaymentIntent(
    productId: string,
    userId: string,
    paymentMethod: 'pix' | 'card' | 'crypto',
    customerData: { name: string; email: string; cpf: string; phone: string },
  ): Promise<{ clientSecret: string; orderId: string; qrCode?: string; pixCode?: string }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['user'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const seller = product.user;
    if (!seller.stripeAccountId || !seller.stripeOnboardingCompleted) {
      if (!seller.stripeAccountId) {
        throw new BadRequestException('Seller is not ready to receive payments');
      }
    }

    const amount = Math.round(product.price * 100);
    const feeAmount = Math.round(amount * 0.03);

    // Criar ou buscar customer no Stripe
    const customer = await this.stripeService.findOrCreateCustomer(customerData.email, {
      name: customerData.name,
      phone: customerData.phone,
      cpf: customerData.cpf,
    });

    // Criar Payment Intent com customer e metadata
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      'brl',
      seller.stripeAccountId,
      feeAmount,
      paymentMethod,
      customer.id,
      {
        product_name: product.name,
        product_id: product.id,
        seller_name: `${seller.firstName} ${seller.lastName}`,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_cpf: customerData.cpf,
      },
    );

    const order = await this.orderRepository.save(
      this.orderRepository.create({
        sellerId: seller.id,
        seller,
        productId: product.id,
        product,
        totalAmount: amount,
        feeAmount,
        paymentMethod: PaymentMethod.STRIPE,
        status: OrderStatus.CREATED,
        attemptCount: 1,
      }),
    );

    const stripePaymentMethodType =
      paymentMethod === 'pix' ? StripePaymentMethodType.PIX : StripePaymentMethodType.CARD;

    // Registrar tentativa de pagamento Stripe
    await this.stripeTransactionRepository.save(
      this.stripeTransactionRepository.create({
        orderId: order.id,
        order,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customer.id,
        paymentMethodType: stripePaymentMethodType,
        amount,
        feeAmount,
        status: StripeTransactionStatus.PAYMENT_PENDING,
      }),
    );

    await this.checkoutTrackingService.recordBackendEvent({
      productId: product.id,
      sellerId: seller.id,
      orderId: order.id,
      eventType: CheckoutEventType.PAYMENT_INTENT_CREATED,
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
        feeAmount,
        totalAmount: amount,
        paymentMethod,
      },
    });

    // Track payment initiated event
    if (paymentMethod === 'pix') {
      this.businessEvents.trackPaymentEvent(PaymentEventType.PIX_PAYMENT_INITIATED, {
        orderId: order.id,
        userId: userId,
        sellerId: seller.id,
        amount: order.totalAmount / 100,
        paymentMethod: 'pix',
        currency: 'BRL',
      });
    } else if (paymentMethod === 'card') {
      this.businessEvents.trackPaymentEvent(PaymentEventType.CARD_PAYMENT_INITIATED, {
        orderId: order.id,
        userId: userId,
        sellerId: seller.id,
        amount: order.totalAmount / 100,
        paymentMethod: 'card',
        currency: 'BRL',
      });
    }

    const response: { clientSecret: string; orderId: string; qrCode?: string; pixCode?: string } = {
      clientSecret: paymentIntent.client_secret!,
      orderId: order.id,
    };

    // Se for PIX, extrair dados do QR Code
    if (paymentMethod === 'pix' && paymentIntent.next_action?.type === 'pix_display_qr_code') {
      const pixData = paymentIntent.next_action.pix_display_qr_code;
      response.qrCode = pixData?.hosted_instructions_url;
      response.pixCode = pixData?.data;
    }

    return response;
  }

  async handleStripeWebhook(signature: string, payload: Buffer): Promise<void> {
    const event = this.stripeService.constructEventFromPayload(signature, payload);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  async initCryptoTransaction(dto: InitCryptoTransactionDto): Promise<{
    orderId: string;
    orderRef: string;
    sellerWallet: string;
    status: CryptoTransactionStatus;
  }> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
      relations: ['user'],
    });

    if (!product || !product.user) {
      throw new NotFoundException('Product not found');
    }

    if (!product.user.cryptoWalletAddress) {
      throw new UnprocessableEntityException('Seller wallet address not configured');
    }

    const totalAmountCents = this.parseFiatToCents(dto.amountFiat);
    if (totalAmountCents <= 0) {
      throw new BadRequestException('amountFiat must be greater than 0');
    }

    const feeAmount = Math.round(totalAmountCents * 0.03);
    const orderRef = `crypto_${randomUUID()}`;

    const order = await this.orderRepository.save(
      this.orderRepository.create({
        sellerId: product.user.id,
        seller: product.user,
        productId: product.id,
        product,
        totalAmount: totalAmountCents,
        feeAmount,
        paymentMethod: PaymentMethod.CRYPTO,
        status: OrderStatus.CREATED,
        attemptCount: 1,
      }),
    );

    await this.cryptoTransactionRepository.save(
      this.cryptoTransactionRepository.create({
        orderId: order.id,
        order,
        attemptNumber: 1,
        orderRef,
        buyerWallet: dto.buyerWallet,
        sellerWallet: product.user.cryptoWalletAddress,
        amountToken: dto.amountToken,
        amountFiat: dto.amountFiat,
        tokenSymbol: dto.tokenSymbol,
        planType: null,
        network: dto.network,
        status: CryptoTransactionStatus.PENDING,
      }),
    );

    // Track crypto transaction created event
    this.businessEvents.trackCryptoEvent(CryptoEventType.TRANSACTION_CREATED, {
      transactionId: orderRef,
      orderId: order.id,
      sellerId: product.user.id,
      buyerWallet: dto.buyerWallet,
      sellerWallet: product.user.cryptoWalletAddress,
      amountToken: dto.amountToken,
      amountFiat: dto.amountFiat,
      tokenSymbol: dto.tokenSymbol,
      network: dto.network,
    });

    // Track checkout event
    await this.checkoutTrackingService.recordBackendEvent({
      productId: product.id,
      sellerId: product.user.id,
      orderId: order.id,
      eventType: CheckoutEventType.PAYMENT_INTENT_CREATED,
      paymentMethod: CheckoutEventPaymentMethod.CRYPTO,
      metadata: {
        orderRef,
        tokenSymbol: dto.tokenSymbol,
        amountToken: dto.amountToken,
        amountFiat: dto.amountFiat,
      },
    });

    return {
      orderId: order.id,
      orderRef,
      sellerWallet: product.user.cryptoWalletAddress,
      status: CryptoTransactionStatus.PENDING,
    };
  }

  async markCryptoSubmitted(dto: MarkCryptoSubmittedDto): Promise<{ status: CryptoTransactionStatus }> {
    const tx = await this.findCryptoByOrderRef(dto.orderRef);

    if (tx.blockchainHash === dto.blockchainHash) {
      return { status: tx.status };
    }

    tx.blockchainHash = dto.blockchainHash;
    await this.cryptoTransactionRepository.save(tx);

    // Track crypto transaction submitted to blockchain event
    this.businessEvents.trackCryptoEvent(CryptoEventType.TRANSACTION_SUBMITTED_TO_BLOCKCHAIN, {
      transactionId: tx.orderRef,
      orderId: tx.orderId,
      blockchainHash: dto.blockchainHash,
      network: tx.network,
    });

    return { status: tx.status };
  }

  async markCryptoCompleted(dto: MarkCryptoCompleteDto): Promise<{ status: CryptoTransactionStatus }> {
    const tx = await this.findCryptoByOrderRef(dto.orderRef);

    if (tx.status === CryptoTransactionStatus.COMPLETED) {
      return { status: tx.status };
    }

    tx.blockchainHash = dto.blockchainHash;
    tx.status = CryptoTransactionStatus.COMPLETED;
    await this.cryptoTransactionRepository.save(tx);

    const order = await this.orderRepository.findOne({
      where: { id: tx.orderId },
      relations: ['product', 'seller'],
    });
    if (!order || !order.product || !order.seller) {
      throw new NotFoundException('Order not found');
    }

    order.status = OrderStatus.COMPLETED;
    await this.orderRepository.save(order);

    // Track order status change
    await this.orderService.updateOrderStatus(order.id, OrderStatus.COMPLETED, order.status);

    const netAmount = order.totalAmount - order.feeAmount;
    const currency = order.product.currency || 'BRL';

    await this.sellerLedgerRepository.save([
      this.sellerLedgerRepository.create({
        sellerId: order.sellerId,
        seller: order.seller,
        orderId: order.id,
        order,
        type: SellerLedgerEntryType.SALE_CREDIT,
        amount: netAmount,
        currency,
        balanceAfter: netAmount,
      }),
      this.sellerLedgerRepository.create({
        sellerId: order.sellerId,
        seller: order.seller,
        orderId: order.id,
        order,
        type: SellerLedgerEntryType.PLATFORM_FEE,
        amount: order.feeAmount,
        currency,
        balanceAfter: netAmount - order.feeAmount,
      }),
    ]);

    // Track crypto transaction completed event
    this.businessEvents.trackCryptoEvent(CryptoEventType.TRANSACTION_COMPLETED, {
      transactionId: tx.orderRef,
      orderId: tx.orderId,
      sellerId: order.sellerId,
      buyerWallet: tx.buyerWallet,
      sellerWallet: tx.sellerWallet,
      amountToken: tx.amountToken,
      amountFiat: tx.amountFiat,
      tokenSymbol: tx.tokenSymbol,
      planType: tx.planType || undefined,
      network: tx.network,
      blockchainHash: dto.blockchainHash,
    });

    // Track checkout event
    await this.checkoutTrackingService.recordBackendEvent({
      productId: order.productId,
      sellerId: order.sellerId,
      orderId: order.id,
      eventType: CheckoutEventType.PAYMENT_SUCCEEDED,
      status: CryptoTransactionStatus.COMPLETED,
      metadata: {
        orderRef: tx.orderRef,
        blockchainHash: tx.blockchainHash,
      },
    });

    return { status: tx.status };
  }

  async markCryptoFailed(dto: MarkCryptoFailedDto): Promise<{ status: CryptoTransactionStatus }> {
    const tx = await this.findCryptoByOrderRef(dto.orderRef);

    if (tx.status === CryptoTransactionStatus.FAILED) {
      return { status: tx.status };
    }

    if (dto.blockchainHash) {
      tx.blockchainHash = dto.blockchainHash;
    }
    tx.status = CryptoTransactionStatus.FAILED;
    await this.cryptoTransactionRepository.save(tx);

    const order = await this.orderRepository.findOne({ where: { id: tx.orderId } });
    if (order) {
      order.status = OrderStatus.FAILED;
      await this.orderRepository.save(order);

      // Track order status change
      await this.orderService.updateOrderStatus(order.id, OrderStatus.FAILED, order.status);

      // Track crypto transaction failed event
      this.businessEvents.trackCryptoEvent(CryptoEventType.TRANSACTION_FAILED, {
        transactionId: tx.orderRef,
        orderId: tx.orderId,
        sellerId: order.sellerId,
        buyerWallet: tx.buyerWallet,
        sellerWallet: tx.sellerWallet,
        amountToken: tx.amountToken,
        amountFiat: tx.amountFiat,
        tokenSymbol: tx.tokenSymbol,
        planType: tx.planType || undefined,
        network: tx.network,
        blockchainHash: tx.blockchainHash || undefined,
        failureReason: dto.reason,
      });

      // Track checkout event
      await this.checkoutTrackingService.recordBackendEvent({
        productId: order.productId,
        sellerId: order.sellerId,
        orderId: order.id,
        eventType: CheckoutEventType.PAYMENT_FAILED,
        status: CryptoTransactionStatus.FAILED,
        metadata: {
          orderRef: tx.orderRef,
          blockchainHash: tx.blockchainHash,
          reason: dto.reason ?? 'crypto_payment_failed',
        },
      });
    }

    return { status: tx.status };
  }

  private async handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
    const stripeTx = await this.stripeTransactionRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
      relations: ['order', 'order.product'],
    });

    if (!stripeTx) {
      console.log(`StripeTransaction not found for paymentIntent ${paymentIntent.id}`);
      return;
    }

    stripeTx.status = StripeTransactionStatus.COMPLETED;
    await this.stripeTransactionRepository.save(stripeTx);

    const order = stripeTx.order;
    order.status = OrderStatus.COMPLETED;
    await this.orderRepository.save(order);

    // Track order status change
    await this.orderService.updateOrderStatus(order.id, OrderStatus.COMPLETED, order.status);

    // Track payment success event
    if (stripeTx.paymentMethodType === StripePaymentMethodType.PIX) {
      this.businessEvents.trackPaymentEvent(PaymentEventType.PIX_PAYMENT_SUCCESS, {
        orderId: order.id,
        userId: order.sellerId,
        sellerId: order.sellerId,
        amount: order.totalAmount / 100,
        paymentMethod: 'pix',
        currency: 'BRL',
      });
    } else if (stripeTx.paymentMethodType === StripePaymentMethodType.CARD) {
      this.businessEvents.trackPaymentEvent(PaymentEventType.CARD_PAYMENT_SUCCESS, {
        orderId: order.id,
        userId: order.sellerId,
        sellerId: order.sellerId,
        amount: order.totalAmount / 100,
        paymentMethod: 'card',
        currency: 'BRL',
      });
    }

    // Ledger: SALE_CREDIT e PLATFORM_FEE
    const seller = await this.userRepository.findOne({ where: { id: order.sellerId } });
    if (!seller) {
      console.log(`Seller not found for order ${order.id}`);
      return;
    }

    // Para simplificar, não estamos calculando saldo anterior; apenas repetindo balanceAfter = amount - fee / -fee.
    const netAmount = order.totalAmount - order.feeAmount;
    const currency = order.product?.currency || 'BRL';

    await this.sellerLedgerRepository.save([
      this.sellerLedgerRepository.create({
        sellerId: seller.id,
        seller,
        orderId: order.id,
        order,
        type: SellerLedgerEntryType.SALE_CREDIT,
        amount: netAmount,
        currency,
        balanceAfter: netAmount,
      }),
      this.sellerLedgerRepository.create({
        sellerId: seller.id,
        seller,
        orderId: order.id,
        order,
        type: SellerLedgerEntryType.PLATFORM_FEE,
        amount: order.feeAmount,
        currency,
        balanceAfter: netAmount - order.feeAmount,
      }),
    ]);

    console.log(`Order ${order.id} marked as COMPLETED and ledger entries created`);

    await this.checkoutTrackingService.recordBackendEvent({
      productId: order.productId,
      sellerId: order.sellerId,
      orderId: order.id,
      eventType: CheckoutEventType.PAYMENT_SUCCEEDED,
      status: StripeTransactionStatus.COMPLETED,
      metadata: {
        stripePaymentIntentId: stripeTx.stripePaymentIntentId,
      },
    });
  }

  private async handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
    const stripeTx = await this.stripeTransactionRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
      relations: ['order'],
    });

    if (!stripeTx) {
      console.log(`StripeTransaction not found for failed paymentIntent ${paymentIntent.id}`);
      return;
    }

    stripeTx.status = StripeTransactionStatus.FAILED;
    await this.stripeTransactionRepository.save(stripeTx);

    const order = stripeTx.order;
    order.status = OrderStatus.FAILED;
    await this.orderRepository.save(order);

    // Track order status change
    await this.orderService.updateOrderStatus(order.id, OrderStatus.FAILED, order.status);

    // Track payment failed event
    if (stripeTx.paymentMethodType === StripePaymentMethodType.PIX) {
      this.businessEvents.trackPaymentEvent(PaymentEventType.PIX_PAYMENT_FAILED, {
        orderId: order.id,
        userId: order.sellerId,
        sellerId: order.sellerId,
        amount: order.totalAmount / 100,
        paymentMethod: 'pix',
        currency: 'BRL',
        failureReason: paymentIntent.last_payment_error?.message || 'payment_failed',
      });
    } else if (stripeTx.paymentMethodType === StripePaymentMethodType.CARD) {
      this.businessEvents.trackPaymentEvent(PaymentEventType.CARD_PAYMENT_FAILED, {
        orderId: order.id,
        userId: order.sellerId,
        sellerId: order.sellerId,
        amount: order.totalAmount / 100,
        paymentMethod: 'card',
        currency: 'BRL',
        failureReason: paymentIntent.last_payment_error?.message || 'payment_failed',
      });
    }

    console.log(`Order ${order.id} marked as FAILED`);

    await this.checkoutTrackingService.recordBackendEvent({
      productId: order.productId,
      sellerId: order.sellerId,
      orderId: order.id,
      eventType: CheckoutEventType.PAYMENT_FAILED,
      status: StripeTransactionStatus.FAILED,
      metadata: {
        stripePaymentIntentId: stripeTx.stripePaymentIntentId,
      },
    });
  }

  private parseFiatToCents(amountFiat: string): number {
    const parsed = Number.parseFloat(amountFiat);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('Invalid amountFiat');
    }
    return Math.round(parsed * 100);
  }

  private async findCryptoByOrderRef(orderRef: string): Promise<CryptoTransaction> {
    const tx = await this.cryptoTransactionRepository.findOne({
      where: { orderRef },
    });
    if (!tx) {
      throw new NotFoundException('Crypto transaction not found');
    }
    return tx;
  }
}
