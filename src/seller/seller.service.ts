import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/product.entity';

export interface SellerWalletAddressResponse {
  sellerId: string;
  productId: string;
  walletAddress: string;
}

@Injectable()
export class SellerService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getWalletAddressByProductId(productId: string): Promise<SellerWalletAddressResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['user'],
    });

    if (!product || !product.user) {
      throw new NotFoundException('Product not found');
    }

    if (!product.user.cryptoWalletAddress) {
      throw new UnprocessableEntityException('Seller wallet address not configured');
    }

    return {
      sellerId: product.user.id,
      productId: product.id,
      walletAddress: product.user.cryptoWalletAddress,
    };
  }
}
