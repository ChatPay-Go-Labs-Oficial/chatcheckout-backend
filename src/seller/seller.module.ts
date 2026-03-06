import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/product.entity';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [SellerController],
  providers: [SellerService],
})
export class SellerModule {}
