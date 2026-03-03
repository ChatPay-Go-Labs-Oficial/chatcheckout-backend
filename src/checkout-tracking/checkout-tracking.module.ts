import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/product.entity';
import { CheckoutTrackingController } from './checkout-tracking.controller';
import { CheckoutTrackingService } from './checkout-tracking.service';
import { CheckoutTrackingSession } from './checkout-tracking-session.entity';
import { CheckoutTrackingEvent } from './checkout-tracking-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CheckoutTrackingSession, CheckoutTrackingEvent, Product])],
  controllers: [CheckoutTrackingController],
  providers: [CheckoutTrackingService],
  exports: [CheckoutTrackingService],
})
export class CheckoutTrackingModule {}
