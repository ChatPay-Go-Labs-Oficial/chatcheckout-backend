import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { OrderService } from './order.service';

@ApiTags('order')
@ApiBearerAuth()
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List authenticated seller orders' })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully.',
    schema: {
      example: {
        total: 2,
        page: 1,
        limit: 10,
        data: [
          {
            id: 'b71ac995-8af0-49be-a52f-0adca6d6f1da',
            sellerId: 'd6a139b8-fd45-4eb4-a23b-dfac90b7d77f',
            productId: 'b2789658-f276-4b87-b5af-1e4a54e95ab8',
            totalAmount: 9990,
            feeAmount: 300,
            paymentMethod: 'STRIPE',
            status: 'COMPLETED',
            attemptCount: 1,
            createdAt: '2026-03-03T12:00:00.000Z',
            updatedAt: '2026-03-03T12:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findMyOrders(@Req() req: Request, @Query() query: FindOrdersQueryDto) {
    if (!req.user || !('userId' in req.user)) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.orderService.findMyOrders(
      (req.user as { userId: string }).userId,
      query.page,
      query.limit,
      query.status,
      query.startDate,
      query.endDate,
    );
  }

  @Get('my/summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get authenticated seller orders summary' })
  @ApiResponse({
    status: 200,
    description: 'Orders summary retrieved successfully.',
    schema: {
      example: {
        totalOrders: 12,
        totalAmount: 125900,
        totalFeeAmount: 3777,
        netAmount: 122123,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyOrdersSummary(@Req() req: Request, @Query() query: FindOrdersQueryDto) {
    if (!req.user || !('userId' in req.user)) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.orderService.getMyOrdersSummary(
      (req.user as { userId: string }).userId,
      query.status,
      query.startDate,
      query.endDate,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get order by ID (seller owner only)' })
  @ApiParam({ name: 'id', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - this order is not yours.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async findById(@Param('id') id: string, @Req() req: Request) {
    if (!req.user || !('userId' in req.user)) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.orderService.findByIdForSeller(id, (req.user as { userId: string }).userId);
  }
}
