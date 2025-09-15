import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { Merchant } from '../merchant/merchant.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Merchant])],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
