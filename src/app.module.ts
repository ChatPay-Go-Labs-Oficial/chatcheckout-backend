import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';
import { UserModule } from './user/user.module';
import { ChatAiModule } from './chat-ai/chat-ai.module';
import { UploadModule } from './upload/upload.module';
import { RedisModule } from './config/redis.module';
import { dataSourceOptions } from './config/typeorm.config';
import { StripeModule } from './stripe/stripe.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { CheckoutTrackingModule } from './checkout-tracking/checkout-tracking.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SellerModule } from './seller/seller.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000, // Converte segundos para ms
          limit: config.get<number>('THROTTLE_LIMIT', 10),
        },
      ],
    }),
    RedisModule,
    AuthModule,
    UserModule,
    ProductModule,
    ChatAiModule,
    UploadModule,
    StripeModule,
    OrderModule,
    PaymentModule,
    CheckoutTrackingModule,
    DashboardModule,
    SellerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
