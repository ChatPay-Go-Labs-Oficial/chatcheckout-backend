import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Merchant } from '../merchant/merchant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const merchant = await this.merchantRepository.findOne({
      where: { id: dto.merchantId },
    });
    if (!merchant) throw new Error('Merchant not found');
    const product = this.productRepository.create({
      name: dto.name,
      price: dto.price,
      currency: dto.currency,
      description: dto.description,
      merchant,
    });
    return this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({ relations: ['merchant'] });
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['merchant'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findByMerchant(merchantId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { merchant: { id: merchantId } },
      relations: ['merchant'],
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    await this.productRepository.remove(product);
  }
}