import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Product } from './product.entity';
import { User } from 'src/user/user.entity';
import { IngestionJob, IngestionStatus } from '../knowledge/ingestion-job.entity';
import { EBOOK_INGESTION_QUEUE } from '../knowledge/knowledge.constants';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDecodeResponseDto } from './dto/product-decode-response.dto';
import { UploadService } from 'src/upload/upload.service';
import { ProductHashService } from './product-hash.service';
import { BusinessEventsService, ProductEventType } from '../common/business-events';
import { SupabaseSyncService } from '../common/supabase/supabase-sync.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(IngestionJob)
    private readonly ingestionJobRepository: Repository<IngestionJob>,
    @InjectQueue(EBOOK_INGESTION_QUEUE)
    private readonly ebookQueue: Queue,
    private readonly uploadService: UploadService,
    private readonly productHashService: ProductHashService,
    private readonly businessEvents: BusinessEventsService,
    private readonly supabaseSync: SupabaseSyncService,
    private readonly config: ConfigService,
  ) {}

  private async enqueuePdfIngestion(
    productId: string,
    sellerId: string,
    productUrl: string,
    originalName: string,
    fileSizeBytes: number,
  ): Promise<void> {
    const publicUrl = this.config.get<string>('R2_PUBLIC_URL')!;
    const r2Key = productUrl.slice(publicUrl.length + 1);

    await this.productRepository.update(productId, {
      ebookR2Key: r2Key,
      knowledgeReady: false,
      knowledgeUpdatedAt: null,
    });

    const jobRecord = this.ingestionJobRepository.create({
      productId,
      sellerId,
      r2Key,
      originalName,
      fileSizeBytes,
      status: IngestionStatus.PENDING,
    });
    const savedJob = await this.ingestionJobRepository.save(jobRecord);

    await this.ebookQueue.add('ingest-ebook', {
      jobId: savedJob.id,
      productId,
      sellerId,
      r2Key,
    });
  }

  async create(
    userId: string,
    dto: CreateProductDto,
    productFile?: Express.Multer.File,
    productImage?: Express.Multer.File,
  ): Promise<Product> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    // Upload dos arquivos apenas se foram fornecidos
    let productUrl: string | undefined;
    let imageUrl: string | undefined;

    if (productFile) {
      productUrl = await this.uploadService.uploadFile(productFile);
    }

    if (productImage) {
      imageUrl = await this.uploadService.uploadFile(productImage);
    }

    const product = this.productRepository.create({
      name: dto.name,
      price: dto.price,
      currency: dto.currency,
      description: dto.description,
      salesPageUrl: dto.salesPageUrl,
      promptAi: dto.promptAi,
      productUrl,
      imageUrl,
      productHash: null, // Will be set after save
      user,
    });

    // Save first to get the product ID
    const savedProduct = await this.productRepository.save(product);

    // Generate final hash with real product ID (single save)
    savedProduct.productHash = this.productHashService.generateHash(
      savedProduct.id,
      dto.salesPageUrl || '',
      dto.promptAi || null,
      userId,
    );

    const finalProduct = await this.productRepository.save(savedProduct);

    void this.supabaseSync.upsertProductMin(finalProduct.id, userId, finalProduct.salesPageUrl ?? null);

    if (productFile && productFile.mimetype === 'application/pdf' && finalProduct.productUrl) {
      void this.enqueuePdfIngestion(finalProduct.id, userId, finalProduct.productUrl, productFile.originalname, productFile.size);
    }

    // Track product created event
    this.businessEvents.trackProductEvent(ProductEventType.PRODUCT_CREATED, {
      productId: finalProduct.id,
      sellerId: finalProduct.user.id,
      productName: finalProduct.name,
      price: finalProduct.price,
      stock: undefined, // Product doesn't have stock field
      data: {
        currency: finalProduct.currency,
        hasProductUrl: !!finalProduct.productUrl,
        hasImageUrl: !!finalProduct.imageUrl,
        hasPromptAi: !!finalProduct.promptAi,
      },
    });

    return finalProduct;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.productRepository.findAndCount({
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      total,
      page,
      limit,
      data,
    };
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findByUser(userId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    userId: string,
    productFile?: Express.Multer.File,
    productImage?: Express.Multer.File,
  ): Promise<Product> {
    // Note: Ownership verification is now handled by ProductOwnerGuard in the controller
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!product) throw new NotFoundException('Product not found');

    // Check if fields that affect hash are being updated
    const hashFieldsChanged =
      (dto.salesPageUrl !== undefined && dto.salesPageUrl !== product.salesPageUrl) ||
      (dto.promptAi !== undefined && dto.promptAi !== product.promptAi);

    const updateData: UpdateProductDto & { productUrl?: string; imageUrl?: string } = { ...dto };

    // Upload new product file (if provided)
    if (productFile) {
      if (product.productUrl) {
        await this.uploadService.deleteFile(product.productUrl);
      }
      const productUrl = await this.uploadService.uploadFile(productFile);
      updateData.productUrl = productUrl;
    }

    // Upload new image (if provided)
    if (productImage) {
      if (product.imageUrl) {
        await this.uploadService.deleteFile(product.imageUrl);
      }
      const imageUrl = await this.uploadService.uploadFile(productImage);
      updateData.imageUrl = imageUrl;
    }

    Object.assign(product, updateData);

    // Regenerate hash if relevant fields changed
    if (hashFieldsChanged) {
      const newHash = this.productHashService.generateHash(
        product.id,
        product.salesPageUrl || '',
        product.promptAi || null,
        userId,
      );
      product.productHash = newHash;
    }

    const updatedProduct = await this.productRepository.save(product);

    void this.supabaseSync.upsertProductMin(updatedProduct.id, userId, updatedProduct.salesPageUrl ?? null);

    if (productFile && productFile.mimetype === 'application/pdf' && updatedProduct.productUrl) {
      void this.enqueuePdfIngestion(updatedProduct.id, userId, updatedProduct.productUrl, productFile.originalname, productFile.size);
    }

    // Track product updated event
    this.businessEvents.trackProductEvent(ProductEventType.PRODUCT_UPDATED, {
      productId: updatedProduct.id,
      sellerId: updatedProduct.user.id,
      productName: updatedProduct.name,
      price: updatedProduct.price,
      data: {
        hashFieldsChanged,
        fieldsUpdated: Object.keys(dto),
      },
    });

    return updatedProduct;
  }

  async remove(id: string, userId: string): Promise<void> {
    // Note: Ownership verification is now handled by ProductOwnerGuard in the controller
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!product) throw new NotFoundException('Product not found');

    try {
      await this.productRepository.remove(product);

      void this.supabaseSync.deleteProductMin(id);

      // Track product deleted event
      this.businessEvents.trackProductEvent(ProductEventType.PRODUCT_DELETED, {
        productId: product.id,
        sellerId: product.user.id,
        productName: product.name,
        price: product.price,
      });
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError?.code === '23503') {
        throw new ConflictException(
          'Este produto não pode ser excluído pois possui pedidos vinculados.',
        );
      }
      throw error;
    }
  }

  decodeProductHash(hash: string): {
    productId: string;
    salesPageUrl: string;
    promptAI: string;
    userId: string;
  } {
    return this.productHashService.decodeHash(hash);
  }

  /**
   * Public endpoint used in checkout flow.
   * Returns product info and limited seller data.
   * The hash acts as a secure identifier but should not expose private seller details.
   */
  async getProductByHash(hash: string): Promise<ProductDecodeResponseDto> {
    try {
      const decoded = this.productHashService.decodeHash(hash);

      const product = await this.productRepository.findOne({
        where: { id: decoded.productId },
        relations: ['user'],
      });

      if (!product || !product.user) {
        throw new NotFoundException('Product or associated user not found');
      }

      // Track product viewed event
      this.businessEvents.trackProductEvent(ProductEventType.PRODUCT_VIEWED, {
        productId: product.id,
        sellerId: product.user.id,
        productName: product.name,
        price: product.price,
      });

      // Return only essential data
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        salesPageUrl: product.salesPageUrl,
        imageUrl: product.imageUrl,
        promptAi: product.promptAi,
        productHash: product.productHash,
        infoproducer: {
          id: product.user.id,
          firstName: product.user.firstName,
          lastName: product.user.lastName,
          companyName: product.user.companyName,
        },
        cryptoPaymentsEnabled: Boolean(product.user.cryptoWalletAddress),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Invalid hash or decryption failed');
    }
  }
}
