import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { User } from 'src/user/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadService } from 'src/upload/upload.service';
import { ProductHashService } from './product-hash.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly uploadService: UploadService,
    private readonly productHashService: ProductHashService,
  ) {}

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

    return this.productRepository.save(savedProduct);
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

  async update(id: string, dto: UpdateProductDto, userId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Check if fields that affect hash are being updated
    const hashFieldsChanged =
      (dto.salesPageUrl && dto.salesPageUrl !== product.salesPageUrl) ||
      (dto.promptAi !== undefined && dto.promptAi !== product.promptAi);

    Object.assign(product, dto);

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

    return this.productRepository.save(product);
  }

  async remove(id: string, userId: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id, user: { id: userId } } });
    if (!product) throw new NotFoundException('Product not found');
    await this.productRepository.remove(product);
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
  async getProductByHash(hash: string): Promise<{
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    salesPageUrl: string;
    imageUrl?: string;
    promptAi?: string;
    productHash: string | null;
    infoproducer: {
      id: string;
      firstName: string;
      lastName: string;
      companyName?: string;
    };
  }> {
    try {
      const decoded = this.productHashService.decodeHash(hash);

      const product = await this.productRepository.findOne({
        where: { id: decoded.productId },
        relations: ['user'],
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

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
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Invalid hash or decryption failed');
    }
  }
}
