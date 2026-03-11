import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  StripePaymentMethodType,
  StripeTransaction,
} from '../payment/stripe-transaction.entity';
import {
  FindSalesQueryDto,
  SalesPaymentType,
  SalesSortBy,
  SortOrder,
} from './dto/find-sales-query.dto';
import { Order, OrderStatus, PaymentMethod } from './order.entity';
import { BusinessEventsService, OrderEventType } from '../common/business-events';

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

export interface SalesListItem {
  orderId: string;
  createdAt: Date;
  productName: string;
  totalAmount: number;
  feeAmount: number;
  netAmount: number;
  status: OrderStatus;
  paymentType: SalesPaymentType;
}

export interface SalesListResult {
  data: SalesListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(StripeTransaction)
    private readonly stripeTransactionRepository: Repository<StripeTransaction>,
    private readonly businessEvents: BusinessEventsService,
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

  async findMySales(sellerId: string, query: FindSalesQueryDto): Promise<SalesListResult> {
    const {
      page = 1,
      limit = 10,
      paymentType,
      startDate,
      endDate,
      sortBy = SalesSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = query;

    const baseQuery = this.orderRepository
      .createQueryBuilder('order')
      .leftJoin(StripeTransaction, 'stripeTx', 'stripeTx.orderId = order.id')
      .where('order.sellerId = :sellerId', { sellerId });

    if (startDate) {
      baseQuery.andWhere('order.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      baseQuery.andWhere('order.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    if (paymentType === SalesPaymentType.CRYPTO) {
      baseQuery.andWhere('order.paymentMethod = :cryptoMethod', {
        cryptoMethod: PaymentMethod.CRYPTO,
      });
    } else if (paymentType === SalesPaymentType.PIX || paymentType === SalesPaymentType.CARD) {
      baseQuery
        .andWhere('order.paymentMethod = :stripeMethod', {
          stripeMethod: PaymentMethod.STRIPE,
        })
        .andWhere('stripeTx.paymentMethodType = :stripePaymentType', {
          stripePaymentType: paymentType,
        });
    }

    const salesQuery = baseQuery
      .clone()
      .leftJoinAndSelect('order.product', 'product')
      .addSelect('stripeTx.paymentMethodType', 'stripeMethodType');

    if (sortBy === SalesSortBy.TOTAL_AMOUNT) {
      salesQuery.orderBy('order.totalAmount', sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else {
      salesQuery.orderBy('order.createdAt', sortOrder.toUpperCase() as 'ASC' | 'DESC');
    }

    const totalResult = await baseQuery
      .clone()
      .select('COUNT(DISTINCT order.id)', 'total')
      .orderBy()
      .getRawOne<{ total: string }>();

    const total = Number(totalResult?.total ?? 0);

    const { entities, raw } = await salesQuery
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();

    const data: SalesListItem[] = entities.map((order, index) => {
      const rawRow = raw[index] as { stripeMethodType?: StripePaymentMethodType };
      const paymentTypeValue = this.mapOrderPaymentType(order.paymentMethod, rawRow?.stripeMethodType);

      return {
        orderId: order.id,
        createdAt: order.createdAt,
        productName: order.product?.name ?? 'Produto',
        totalAmount: order.totalAmount,
        feeAmount: order.feeAmount,
        netAmount: order.totalAmount - order.feeAmount,
        status: order.status,
        paymentType: paymentTypeValue,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
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

    // Track order viewed event
    this.businessEvents.trackOrderEvent(OrderEventType.ORDER_UPDATED, {
      orderId: order.id,
      userId: sellerId,
      sellerId: order.sellerId,
      total: order.totalAmount / 100, // Convert cents to currency unit
      status: order.status,
      data: {
        action: 'viewed_by_seller',
        productName: order.product?.name,
      },
    });

    return order;
  }

  private mapOrderPaymentType(
    paymentMethod: PaymentMethod,
    stripePaymentType?: StripePaymentMethodType,
  ): SalesPaymentType {
    if (paymentMethod === PaymentMethod.CRYPTO) {
      return SalesPaymentType.CRYPTO;
    }

    if (stripePaymentType === StripePaymentMethodType.PIX) {
      return SalesPaymentType.PIX;
    }

    return SalesPaymentType.CARD;
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

  /**
   * Update order status with business event tracking
   * This method is called when order status changes (e.g., from PaymentService)
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    previousStatus?: OrderStatus,
  ): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['product', 'seller'],
    });

    if (!order) {
      return;
    }

    // Track appropriate event based on status change
    if (newStatus === OrderStatus.COMPLETED) {
      this.businessEvents.trackOrderEvent(OrderEventType.ORDER_COMPLETED, {
        orderId: order.id,
        userId: order.sellerId,
        sellerId: order.sellerId,
        total: order.totalAmount / 100, // Convert cents to currency unit
        status: newStatus,
        previousStatus: previousStatus,
        data: {
          productName: order.product?.name,
          paymentMethod: order.paymentMethod,
        },
      });
    } else if (newStatus === OrderStatus.FAILED) {
      this.businessEvents.trackOrderEvent(OrderEventType.ORDER_CANCELLED, {
        orderId: order.id,
        userId: order.sellerId,
        sellerId: order.sellerId,
        total: order.totalAmount / 100,
        status: newStatus,
        previousStatus: previousStatus,
        data: {
          productName: order.product?.name,
          paymentMethod: order.paymentMethod,
          reason: 'payment_failed',
        },
      });
    } else {
      // Generic status change
      this.businessEvents.trackOrderEvent(OrderEventType.ORDER_STATUS_CHANGED, {
        orderId: order.id,
        userId: order.sellerId,
        sellerId: order.sellerId,
        total: order.totalAmount / 100,
        status: newStatus,
        previousStatus: previousStatus || order.status,
        data: {
          productName: order.product?.name,
        },
      });
    }
  }
}
