import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetSellerWalletQueryDto } from './dto/get-seller-wallet-query.dto';
import { SellerService } from './seller.service';

@ApiTags('seller')
@Controller('seller')
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  @Get('wallet-address')
  @ApiOperation({ summary: 'Get seller wallet address by product ID' })
  @ApiResponse({
    status: 200,
    description: 'Seller wallet address found',
    schema: {
      example: {
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        productId: '8b9989c8-ec79-4e10-ae07-8f632f0fb519',
        walletAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 422, description: 'Seller wallet address not configured' })
  getWalletAddress(@Query() query: GetSellerWalletQueryDto) {
    return this.sellerService.getWalletAddressByProductId(query.productId);
  }
}
