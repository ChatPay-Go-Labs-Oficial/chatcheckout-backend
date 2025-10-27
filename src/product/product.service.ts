import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { User } from 'src/user/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly uploadService: UploadService,
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
      user,
    });

    return this.productRepository.save(product);
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
    const product = await this.productRepository.findOne({ where: { id, user: { id: userId } } });
    if (!product) throw new NotFoundException('Product not found');
    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async remove(id: string, userId: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id, user: { id: userId } } });
    if (!product) throw new NotFoundException('Product not found');
    await this.productRepository.remove(product);
  }
}
