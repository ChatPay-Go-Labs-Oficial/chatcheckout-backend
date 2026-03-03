import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CheckoutTrackingEvent } from '../checkout-tracking/checkout-tracking-event.entity';
import {
  CheckoutEventPaymentMethod,
  CheckoutEventType,
} from '../checkout-tracking/checkout-tracking.enums';
import { CheckoutTrackingSession } from '../checkout-tracking/checkout-tracking-session.entity';
import { Order, OrderStatus } from '../order/order.entity';
import { CheckoutDashboardQueryDto } from './dto/checkout-dashboard-query.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(CheckoutTrackingEvent)
    private readonly eventRepository: Repository<CheckoutTrackingEvent>,
    @InjectRepository(CheckoutTrackingSession)
    private readonly sessionRepository: Repository<CheckoutTrackingSession>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async getCheckoutSummary(sellerId: string, query: CheckoutDashboardQueryDto) {
    const { startDate, endDate, productId } = query;

    const sessionsCount = await this.applySessionFilters(
      this.sessionRepository
        .createQueryBuilder('session')
        .where('session.sellerId = :sellerId', { sellerId }),
      { startDate, endDate, productId },
    ).getCount();

    const conversionsCount = await this.applyEventFilters(
      this.eventRepository
        .createQueryBuilder('event')
        .where('event.sellerId = :sellerId', { sellerId })
        .andWhere('event.eventType = :eventType', {
          eventType: CheckoutEventType.PAYMENT_SUCCEEDED,
        }),
      { startDate, endDate, productId },
    ).getCount();

    const completedOrders = await this.applyOrderFilters(
      this.orderRepository
        .createQueryBuilder('order')
        .where('order.sellerId = :sellerId', { sellerId })
        .andWhere('order.status = :status', { status: OrderStatus.COMPLETED }),
      { startDate, endDate, productId },
    )
      .select('COUNT(order.id)', 'totalOrders')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(order.feeAmount), 0)', 'totalFeeAmount')
      .getRawOne<{
        totalOrders: string;
        totalAmount: string;
        totalFeeAmount: string;
      }>();

    const totalOrders = Number(completedOrders?.totalOrders ?? 0);
    const totalAmount = Number(completedOrders?.totalAmount ?? 0);
    const totalFeeAmount = Number(completedOrders?.totalFeeAmount ?? 0);
    const conversionRate = sessionsCount > 0 ? (conversionsCount / sessionsCount) * 100 : 0;
    const avgTicket = totalOrders > 0 ? totalAmount / totalOrders : 0;

    return {
      sessions: sessionsCount,
      successfulCheckouts: conversionsCount,
      conversionRate: Number(conversionRate.toFixed(2)),
      totalOrders,
      totalAmount,
      totalFeeAmount,
      netAmount: totalAmount - totalFeeAmount,
      avgTicket: Number(avgTicket.toFixed(2)),
    };
  }

  async getCheckoutFunnel(sellerId: string, query: CheckoutDashboardQueryDto) {
    const stageMap: Array<{ label: string; eventType: CheckoutEventType }> = [
      { label: 'Sessões iniciadas', eventType: CheckoutEventType.CHECKOUT_SESSION_STARTED },
      { label: 'Checkout iniciado', eventType: CheckoutEventType.CHECKOUT_STARTED },
      { label: 'Dados enviados', eventType: CheckoutEventType.CUSTOMER_DATA_SUBMITTED },
      { label: 'Método selecionado', eventType: CheckoutEventType.PAYMENT_METHOD_SELECTED },
      { label: 'Tentativa de pagamento', eventType: CheckoutEventType.PAYMENT_CONFIRM_CLICKED },
      { label: 'Pagamento concluído', eventType: CheckoutEventType.PAYMENT_SUCCEEDED },
    ];

    const result: Array<{ label: string; value: number }> = [];

    for (const stage of stageMap) {
      const value = await this.applyEventFilters(
        this.eventRepository
          .createQueryBuilder('event')
          .where('event.sellerId = :sellerId', { sellerId })
          .andWhere('event.eventType = :eventType', { eventType: stage.eventType }),
        query,
      )
        .select('COUNT(DISTINCT event.sessionId)', 'count')
        .getRawOne<{ count: string }>();

      result.push({
        label: stage.label,
        value: Number(value?.count ?? 0),
      });
    }

    return { stages: result };
  }

  async getCheckoutAbandonment(sellerId: string, query: CheckoutDashboardQueryDto) {
    const activeAbandonment = await this.applySessionFilters(
      this.sessionRepository
        .createQueryBuilder('session')
        .where('session.sellerId = :sellerId', { sellerId })
        .andWhere('session.endReason = :reason', { reason: 'ABANDONED' }),
      query,
    ).getCount();

    const dropByStep = await this.applyEventFilters(
      this.eventRepository
        .createQueryBuilder('event')
        .where('event.sellerId = :sellerId', { sellerId })
        .andWhere('event.eventType = :eventType', {
          eventType: CheckoutEventType.CHECKOUT_ABANDONED,
        }),
      query,
    )
      .select('COALESCE(event.step::text, :unknown)', 'step')
      .addSelect('COUNT(event.id)', 'count')
      .setParameter('unknown', 'UNKNOWN')
      .groupBy('COALESCE(event.step::text, :unknown)')
      .orderBy('COUNT(event.id)', 'DESC')
      .getRawMany<{ step: string; count: string }>();

    return {
      totalAbandonedSessions: activeAbandonment,
      byStep: dropByStep.map((item) => ({ step: item.step, count: Number(item.count) })),
    };
  }

  async getPaymentsBreakdown(sellerId: string, query: CheckoutDashboardQueryDto) {
    const rows = await this.applyEventFilters(
      this.eventRepository
        .createQueryBuilder('event')
        .where('event.sellerId = :sellerId', { sellerId })
        .andWhere('event.eventType IN (:...types)', {
          types: [CheckoutEventType.PAYMENT_SUCCEEDED, CheckoutEventType.PAYMENT_FAILED],
        }),
      query,
    )
      .select('COALESCE(event."payment_method"::text, :unknown)', 'paymentMethod')
      .addSelect('event."event_type"::text', 'eventType')
      .addSelect('COUNT(event.id)', 'count')
      .setParameter('unknown', 'UNKNOWN')
      .groupBy('COALESCE(event."payment_method"::text, :unknown)')
      .addGroupBy('event."event_type"::text')
      .getRawMany<{ paymentMethod: string; eventType: string; count: string }>();

    const methods = [
      CheckoutEventPaymentMethod.PIX,
      CheckoutEventPaymentMethod.CARD,
      CheckoutEventPaymentMethod.CRYPTO,
    ];

    const breakdown = methods.map((method) => {
      const success = rows.find(
        (row) =>
          row.paymentMethod === method && row.eventType === CheckoutEventType.PAYMENT_SUCCEEDED,
      );
      const failed = rows.find(
        (row) => row.paymentMethod === method && row.eventType === CheckoutEventType.PAYMENT_FAILED,
      );

      const successCount = Number(success?.count ?? 0);
      const failedCount = Number(failed?.count ?? 0);
      const attempts = successCount + failedCount;

      return {
        paymentMethod: method,
        attempts,
        success: successCount,
        failed: failedCount,
        successRate: attempts > 0 ? Number(((successCount / attempts) * 100).toFixed(2)) : 0,
      };
    });

    return { breakdown };
  }

  async getDailySales(sellerId: string, query: CheckoutDashboardQueryDto) {
    const rows = await this.applyOrderFilters(
      this.orderRepository
        .createQueryBuilder('order')
        .where('order.sellerId = :sellerId', { sellerId })
        .andWhere('order.status = :status', { status: OrderStatus.COMPLETED }),
      query,
    )
      .select(`TO_CHAR(DATE_TRUNC('day', order.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'value')
      .groupBy(`DATE_TRUNC('day', order.createdAt)`)
      .orderBy(`DATE_TRUNC('day', order.createdAt)`, 'ASC')
      .getRawMany<{ day: string; value: string }>();

    return {
      data: rows.map((row) => ({
        day: row.day,
        value: Number(row.value),
      })),
    };
  }

  private applyEventFilters<T extends SelectQueryBuilder<CheckoutTrackingEvent>>(
    queryBuilder: T,
    query: Pick<CheckoutDashboardQueryDto, 'startDate' | 'endDate' | 'productId'>,
  ): T {
    if (query.productId) {
      queryBuilder.andWhere('event.productId = :productId', { productId: query.productId });
    }

    if (query.startDate) {
      queryBuilder.andWhere('event.occurredAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('event.occurredAt <= :endDate', { endDate: new Date(query.endDate) });
    }

    return queryBuilder;
  }

  private applySessionFilters<T extends SelectQueryBuilder<CheckoutTrackingSession>>(
    queryBuilder: T,
    query: Pick<CheckoutDashboardQueryDto, 'startDate' | 'endDate' | 'productId'>,
  ): T {
    if (query.productId) {
      queryBuilder.andWhere('session.productId = :productId', { productId: query.productId });
    }

    if (query.startDate) {
      queryBuilder.andWhere('session.startedAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('session.startedAt <= :endDate', { endDate: new Date(query.endDate) });
    }

    return queryBuilder;
  }

  private applyOrderFilters<T extends SelectQueryBuilder<Order>>(
    queryBuilder: T,
    query: Pick<CheckoutDashboardQueryDto, 'startDate' | 'endDate' | 'productId'>,
  ): T {
    if (query.productId) {
      queryBuilder.andWhere('order.productId = :productId', { productId: query.productId });
    }

    if (query.startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: new Date(query.endDate) });
    }

    return queryBuilder;
  }
}
