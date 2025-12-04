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
  ): Promise<{ clientSecret: string; orderId: string }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['user'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const seller = product.user;
    if (!seller.stripeAccountId || !seller.stripeOnboardingCompleted) {
      // In a real scenario, we might want to handle this gracefully or check before allowing the product to be sold.
      // For now, we assume the seller is onboarded or we fail.
      // However, the requirement says "User registers... generates links... client buys".
      // If seller is not onboarded, they can't receive payments.
      // We can throw an error or check this earlier.
      // Let's assume we throw error if seller is not ready.
      if (!seller.stripeAccountId) {
        throw new BadRequestException('Seller is not ready to receive payments');
      }
    }

    const amount = Math.round(product.price * 100); // Convert to cents
    const feeAmount = Math.round(amount * 0.03); // 3% fee

    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      'brl', // Assuming BRL for now, or use product.currency
      seller.stripeAccountId,
      feeAmount,
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

    return {
      clientSecret: paymentIntent.client_secret!,
      orderId: order.id,
    };
  }
}
