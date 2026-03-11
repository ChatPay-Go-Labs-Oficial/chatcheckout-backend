import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { User } from 'src/user/user.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductHashService } from './product-hash.service';
import { UploadService } from 'src/upload/upload.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, User]), AuthModule],
  controllers: [ProductController],
  providers: [ProductService, ProductHashService, UploadService],
})
export class ProductModule {}
