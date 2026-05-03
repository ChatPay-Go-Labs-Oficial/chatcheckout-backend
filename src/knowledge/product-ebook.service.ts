import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Product } from '../product/product.entity';
import { IngestionJob, IngestionStatus } from './ingestion-job.entity';
import { UploadService } from '../upload/upload.service';
import { randomUUID } from 'crypto';
import { EBOOK_INGESTION_QUEUE } from './knowledge.constants';

@Injectable()
export class ProductEbookService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(IngestionJob)
    private readonly ingestionJobRepository: Repository<IngestionJob>,
    private readonly uploadService: UploadService,
    @InjectQueue(EBOOK_INGESTION_QUEUE)
    private readonly ebookIngestionQueue: Queue,
  ) {}

  async handleEbookUpload(productId: string, sellerId: string, file: Express.Multer.File) {
    const product = await this.productRepository.findOne({
      where: { id: productId, user: { id: sellerId } },
      relations: ['user'],
    });

    if (!product) {
      throw new NotFoundException('Product not found or does not belong to the seller');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed for E-books');
    }

    const uuid = randomUUID();
    const r2Key = `ebooks/${sellerId}/${productId}/${uuid}.pdf`;

    // Upload to R2
    await this.uploadService.uploadFileWithKey(file, r2Key);

    // Update Product
    product.knowledgeReady = false;
    product.ebookR2Key = r2Key;
    await this.productRepository.save(product);

    // Create IngestionJob
    const jobRecord = this.ingestionJobRepository.create({
      product: { id: productId },
      seller: { id: sellerId },
      r2Key: r2Key,
      originalName: file.originalname,
      fileSizeBytes: file.size,
      status: IngestionStatus.PENDING,
    });
    const savedJob = await this.ingestionJobRepository.save(jobRecord);

    // Enqueue BullMQ Job
    await this.ebookIngestionQueue.add('ingest-ebook', {
      jobId: savedJob.id,
      productId: productId,
      sellerId: sellerId,
      r2Key: r2Key,
    });

    return {
      jobId: savedJob.id,
      status: IngestionStatus.PENDING,
    };
  }

  async getIngestionStatus(productId: string, sellerId: string) {
    // Return latest job
    const job = await this.ingestionJobRepository.findOne({
      where: { product: { id: productId }, sellerId: sellerId },
      order: { createdAt: 'DESC' },
    });

    if (!job) {
      throw new NotFoundException('No ingestion job found for this product');
    }

    return {
      jobId: job.id,
      status: job.status,
      chunksCreated: job.chunksCreated,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }
}
