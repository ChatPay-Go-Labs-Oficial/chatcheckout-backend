import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { UploadModule } from '../upload/upload.module';
import { AuthModule } from '../auth/auth.module';
import { Product } from '../product/product.entity';
import { IngestionJob } from './ingestion-job.entity';
import { ProductEbookService } from './product-ebook.service';
import { ProductEbookController } from './product-ebook.controller';
import { EBOOK_INGESTION_QUEUE } from './knowledge.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, IngestionJob]),
    BullModule.registerQueue({
      name: EBOOK_INGESTION_QUEUE,
    }),
    UploadModule,
    AuthModule,
  ],
  controllers: [ProductEbookController],
  providers: [ProductEbookService],
  exports: [ProductEbookService],
})
export class KnowledgeModule {}
