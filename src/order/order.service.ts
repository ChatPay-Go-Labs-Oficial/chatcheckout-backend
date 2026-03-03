import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Order, OrderStatus } from './order.entity';

export interface OrderListResult {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderSummaryResult {
  totalOrders: number;
  totalAmount: number;
  totalFeeAmount: number;
  netAmount: number;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async findMyOrders(
    sellerId: string,
    page: number = 1,
    limit: number = 10,
    status?: OrderStatus,
    startDate?: string,
    endDate?: string,
  ): Promise<OrderListResult> {
    const query = this.buildSellerOrdersQuery(sellerId, status, startDate, endDate)
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('order.seller', 'seller')
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getMyOrdersSummary(
    sellerId: string,
    status?: OrderStatus,
    startDate?: string,
    endDate?: string,
  ): Promise<OrderSummaryResult> {
    const summary = await this.buildSellerOrdersQuery(sellerId, status, startDate, endDate)
      .select('COUNT(order.id)', 'totalOrders')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(order.feeAmount), 0)', 'totalFeeAmount')
      .getRawOne<{
        totalOrders: string;
        totalAmount: string;
        totalFeeAmount: string;
      }>();

    const totalOrders = Number(summary?.totalOrders ?? 0);
    const totalAmount = Number(summary?.totalAmount ?? 0);
    const totalFeeAmount = Number(summary?.totalFeeAmount ?? 0);

    return {
      totalOrders,
      totalAmount,
      totalFeeAmount,
      netAmount: totalAmount - totalFeeAmount,
    };
  }

  async findByIdForSeller(orderId: string, sellerId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['product', 'seller'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.sellerId !== sellerId) {
      throw new ForbiddenException('You do not have permission to access this order');
    }

    return order;
  }

  private buildSellerOrdersQuery(
    sellerId: string,
    status?: OrderStatus,
    startDate?: string,
    endDate?: string,
  ): SelectQueryBuilder<Order> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .where('order.sellerId = :sellerId', { sellerId });

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    if (startDate) {
      query.andWhere('order.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      query.andWhere('order.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    return query;
  }
}
