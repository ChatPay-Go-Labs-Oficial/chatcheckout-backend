import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { User } from 'src/user/user.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { UploadService } from 'src/upload/upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, User])],
  controllers: [ProductController],
  providers: [ProductService, UploadService],
})
export class ProductModule {}
