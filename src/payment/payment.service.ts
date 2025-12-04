import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { Order, OrderStatus } from '../order/order.entity';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private stripeService: StripeService,
  ) { }

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

    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      'brl',
      seller.stripeAccountId,
      feeAmount,
      paymentMethod,
    );

    const order = this.orderRepository.create({
      amount,
      feeAmount,
      stripePaymentIntentId: paymentIntent.id,
      status: OrderStatus.PENDING,
      seller: seller,
      product: product,
    });

    await this.orderRepository.save(order);

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
    const order = await this.orderRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (order) {
      order.status = OrderStatus.COMPLETED;
      await this.orderRepository.save(order);
      console.log(`Order ${order.id} marked as COMPLETED`);
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (order) {
      order.status = OrderStatus.FAILED;
      await this.orderRepository.save(order);
      console.log(`Order ${order.id} marked as FAILED`);
    }
  }
}
