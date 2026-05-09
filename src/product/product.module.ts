import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Product } from './product.entity';
import { User } from 'src/user/user.entity';
import { IngestionJob } from '../knowledge/ingestion-job.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductHashService } from './product-hash.service';
import { UploadService } from 'src/upload/upload.service';
import { AuthModule } from '../auth/auth.module';
import { EBOOK_INGESTION_QUEUE } from '../knowledge/knowledge.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, User, IngestionJob]),
    BullModule.registerQueue({ name: EBOOK_INGESTION_QUEUE }),
    AuthModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductHashService, UploadService],
})
export class ProductModule {}
