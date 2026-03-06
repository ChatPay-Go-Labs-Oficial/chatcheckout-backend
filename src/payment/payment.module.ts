import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { Order } from '../order/order.entity';
import { StripeModule } from '../stripe/stripe.module';
import { AuthModule } from '../auth/auth.module';
import { StripeTransaction } from './stripe-transaction.entity';
import { CryptoTransaction } from './crypto-transaction.entity';
import { SellerLedgerEntry } from './seller-ledger-entry.entity';
import { CheckoutTrackingModule } from '../checkout-tracking/checkout-tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Product,
      Order,
      StripeTransaction,
      CryptoTransaction,
      SellerLedgerEntry,
    ]),
    StripeModule,
    AuthModule,
    CheckoutTrackingModule,
  ],
  providers: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
