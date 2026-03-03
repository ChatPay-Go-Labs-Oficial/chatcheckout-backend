import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CheckoutTrackingEvent } from '../checkout-tracking/checkout-tracking-event.entity';
import { CheckoutTrackingSession } from '../checkout-tracking/checkout-tracking-session.entity';
import { Order } from '../order/order.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckoutTrackingEvent, CheckoutTrackingSession, Order]),
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
