import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/product.entity';
import { SellerService } from './seller.service';

describe('SellerService', () => {
  let service: SellerService;
  let productRepository: Repository<Product>;

  const mockRepository = () => ({
    findOne: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerService,
        {
          provide: getRepositoryToken(Product),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SellerService>(SellerService);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  it('returns wallet address when product and seller wallet exist', async () => {
    const product = {
      id: 'product-id',
      user: {
        id: 'seller-id',
        cryptoWalletAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      },
    };

    (productRepository.findOne as jest.Mock).mockResolvedValue(product);

    const result = await service.getWalletAddressByProductId('product-id');

    expect(result).toEqual({
      sellerId: 'seller-id',
      productId: 'product-id',
      walletAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    });
  });

  it('throws NotFoundException when product does not exist', async () => {
    (productRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.getWalletAddressByProductId('missing')).rejects.toThrow(NotFoundException);
  });

  it('throws UnprocessableEntityException when wallet is not configured', async () => {
    const product = {
      id: 'product-id',
      user: {
        id: 'seller-id',
        cryptoWalletAddress: null,
      },
    };
    (productRepository.findOne as jest.Mock).mockResolvedValue(product);

    await expect(service.getWalletAddressByProductId('product-id')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });
});
