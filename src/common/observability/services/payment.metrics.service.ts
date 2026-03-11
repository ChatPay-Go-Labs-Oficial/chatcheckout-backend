import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../../order/order.entity';

/**
 * Payment Metrics Service
 *
 * Provides payment metrics and transaction analysis.
 * Queries the orders table for payment-related metrics.
 */
@Injectable()
export class PaymentMetricsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * Get overall payment metrics
   */
  async getPaymentMetrics(timeRange?: string) {
    const dateFilter = this.getDateFilter(timeRange);

    const totalOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :startDate', dateFilter)
      .select('COUNT(order.id)', 'count')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(order.feeAmount), 0)', 'totalFeeAmount')
      .getRawOne<{
      count: string;
      totalAmount: string;
      totalFeeAmount: string;
    }>();

    const completedOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.createdAt >= :startDate', dateFilter)
      .select('COUNT(order.id)', 'count')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalAmount')
      .getRawOne<{
      count: string;
      totalAmount: string;
    }>();

    const failedOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: OrderStatus.FAILED })
      .andWhere('order.createdAt >= :startDate', dateFilter)
      .select('COUNT(order.id)', 'count')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalAmount')
      .getRawOne<{
      count: string;
      totalAmount: string;
    }>();

    const totalCount = Number(totalOrders?.count ?? 0);
    const completedCount = Number(completedOrders?.count ?? 0);
    const failedCount = Number(failedOrders?.count ?? 0);

    return {
      total: {
        count: totalCount,
        amount: Number(totalOrders?.totalAmount ?? 0),
        feeAmount: Number(totalOrders?.totalFeeAmount ?? 0),
        netAmount: Number(totalOrders?.totalAmount ?? 0) - Number(totalOrders?.totalFeeAmount ?? 0),
      },
      completed: {
        count: completedCount,
        amount: Number(completedOrders?.totalAmount ?? 0),
      },
      failed: {
        count: failedCount,
        amount: Number(failedOrders?.totalAmount ?? 0),
      },
      successRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
      failureRate: totalCount > 0 ? (failedCount / totalCount) * 100 : 0,
    };
  }

  /**
   * Get payment method breakdown
   */
  async getPaymentMethodBreakdown(timeRange?: string) {
    const dateFilter = this.getDateFilter(timeRange);

    const results = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :startDate', dateFilter)
      .select('order.paymentMethod', 'method')
      .addSelect('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalAmount')
      .groupBy('order.paymentMethod')
      .addGroupBy('order.status')
      .orderBy('order.paymentMethod', 'ASC')
      .getRawMany<{
      method: string;
      status: string;
      count: string;
      totalAmount: string;
    }>();

    // Group by payment method
    const grouped = new Map<string, any>();

    for (const row of results) {
      if (!grouped.has(row.method)) {
        grouped.set(row.method, {
          method: row.method,
          total: { count: 0, amount: 0 },
          completed: { count: 0, amount: 0 },
          failed: { count: 0, amount: 0 },
        });
      }

      const method = grouped.get(row.method);
      const count = Number(row.count);
      const amount = Number(row.totalAmount);

      method.total.count += count;
      method.total.amount += amount;

      if (row.status === OrderStatus.COMPLETED) {
        method.completed.count += count;
        method.completed.amount += amount;
      } else if (row.status === OrderStatus.FAILED) {
        method.failed.count += count;
        method.failed.amount += amount;
      }
    }

    return {
      methods: Array.from(grouped.values()).map((m) => ({
        ...m,
        successRate:
          m.total.count > 0
            ? (m.completed.count / m.total.count) * 100
            : 0,
      })),
    };
  }

  /**
   * Get payment time series for charts
   */
  async getPaymentTimeSeries(
    timeRange: string = '24h',
    interval: string = 'hour',
  ) {
    const dateFilter = this.getDateFilter(timeRange);
    const truncFormat = interval === 'hour' ? 'hour' : 'day';

    const results = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :startDate', dateFilter)
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .select(
        `TO_CHAR(DATE_TRUNC('${truncFormat}', order.createdAt), 'YYYY-MM-DD HH24:MI:SS')`,
        'time',
      )
      .addSelect('COUNT(order.id)', 'count')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'amount')
      .groupBy(`DATE_TRUNC('${truncFormat}', order.createdAt)`)
      .orderBy(`DATE_TRUNC('${truncFormat}', order.createdAt)`, 'ASC')
      .getRawMany<{
      time: string;
      count: string;
      amount: string;
    }>();

    return {
      timeRange,
      interval,
      data: results.map((r) => ({
        time: r.time,
        count: Number(r.count),
        amount: Number(r.amount),
      })),
    };
  }

  /**
   * Get average order value metrics
   */
  async getAverageOrderValue(timeRange?: string) {
    const dateFilter = this.getDateFilter(timeRange);

    const result = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.createdAt >= :startDate', dateFilter)
      .select('COALESCE(AVG(order.totalAmount), 0)', 'avgOrderValue')
      .addSelect('COALESCE(MIN(order.totalAmount), 0)', 'minOrderValue')
      .addSelect('COALESCE(MAX(order.totalAmount), 0)', 'maxOrderValue')
      .getRawOne<{
      avgOrderValue: string;
      minOrderValue: string;
      maxOrderValue: string;
    }>();

    return {
      average: Number(result?.avgOrderValue ?? 0),
      minimum: Number(result?.minOrderValue ?? 0),
      maximum: Number(result?.maxOrderValue ?? 0),
    };
  }

  /**
   * Get date filter for queries
   */
  private getDateFilter(timeRange?: string): { startDate: Date } {
    const now = new Date();
    let startDate = new Date(0); // Default to all time

    if (timeRange) {
      const match = timeRange.match(/^(\d+)([hdw])$/);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
          case 'h':
            startDate = new Date(now.getTime() - value * 60 * 60 * 1000);
            break;
          case 'd':
            startDate = new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
            break;
          case 'w':
            startDate = new Date(
              now.getTime() - value * 7 * 24 * 60 * 60 * 1000,
            );
            break;
        }
      }
    }

    return { startDate };
  }
}
