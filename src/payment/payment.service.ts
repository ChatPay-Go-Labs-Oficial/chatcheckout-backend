import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { Order, OrderStatus, PaymentMethod } from '../order/order.entity';
import { StripeService } from '../stripe/stripe.service';
import { StripeTransaction, StripeTransactionStatus } from './stripe-transaction.entity';
import { SellerLedgerEntry, SellerLedgerEntryType } from './seller-ledger-entry.entity';

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
    @InjectRepository(SellerLedgerEntry)
    private sellerLedgerRepository: Repository<SellerLedgerEntry>,
    private stripeService: StripeService,
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

    // Registrar tentativa de pagamento Stripe
    await this.stripeTransactionRepository.save(
      this.stripeTransactionRepository.create({
        orderId: order.id,
        order,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customer.id,
        amount,
        feeAmount,
        status: StripeTransactionStatus.PAYMENT_PENDING,
      }),
    );

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

    console.log(`Order ${order.id} marked as FAILED`);
  }
}
