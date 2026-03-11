import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckoutTrackingEvent } from '../../../checkout-tracking/checkout-tracking-event.entity';
import { CheckoutTrackingSession } from '../../../checkout-tracking/checkout-tracking-session.entity';
import {
  CheckoutEventType,
  CheckoutEventPaymentMethod,
} from '../../../checkout-tracking/checkout-tracking.enums';

/**
 * Checkout Metrics Service
 *
 * Provides business observability metrics from checkout tracking events.
 * Extends existing dashboard functionality with observability-specific metrics.
 */
@Injectable()
export class CheckoutMetricsService {
  constructor(
    @InjectRepository(CheckoutTrackingEvent)
    private readonly eventRepository: Repository<CheckoutTrackingEvent>,
    @InjectRepository(CheckoutTrackingSession)
    private readonly sessionRepository: Repository<CheckoutTrackingSession>,
  ) {}

  /**
   * Get overall conversion rate metrics
   */
  async getConversionMetrics(timeRange?: string) {
    const dateFilter = this.getDateFilter(timeRange);

    const totalSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.startedAt >= :startDate', dateFilter)
      .getCount();

    const conversions = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.eventType = :eventType', {
        eventType: CheckoutEventType.PAYMENT_SUCCEEDED,
      })
      .andWhere('event.occurredAt >= :startDate', dateFilter)
      .select('COUNT(DISTINCT event.sessionId)', 'count')
      .getRawOne<{ count: string }>();

    const conversionRate =
      totalSessions > 0
        ? (Number(conversions?.count ?? 0) / totalSessions) * 100
        : 0;

    return {
      totalSessions,
      successfulCheckouts: Number(conversions?.count ?? 0),
      conversionRate: Number(conversionRate.toFixed(2)),
      timeRange: timeRange || 'all',
    };
  }

  /**
   * Get funnel analysis with drop-off rates
   */
  async getFunnelMetrics(timeRange?: string) {
    const dateFilter = this.getDateFilter(timeRange);

    const funnelStages = [
      CheckoutEventType.CHECKOUT_SESSION_STARTED,
      CheckoutEventType.CHECKOUT_STARTED,
      CheckoutEventType.CUSTOMER_DATA_SUBMITTED,
      CheckoutEventType.PAYMENT_METHOD_SELECTED,
      CheckoutEventType.PAYMENT_CONFIRM_CLICKED,
      CheckoutEventType.PAYMENT_SUCCEEDED,
    ];

    const metrics: Array<{ stage: any; count: number }> = [];

    for (const stage of funnelStages) {
      const count = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.eventType = :eventType', { eventType: stage })
        .andWhere('event.occurredAt >= :startDate', dateFilter)
        .select('COUNT(DISTINCT event.sessionId)', 'count')
        .getRawOne<{ count: string }>();

      metrics.push({
        stage,
        count: Number(count?.count ?? 0),
      });
    }

    // Calculate drop-off rates
    const withDropOff = metrics.map((metric, index) => {
      const dropOff =
        index > 0 && metrics[index - 1].count > 0
          ? ((metrics[index - 1].count - metric.count) /
              metrics[index - 1].count) *
            100
          : 0;

      return {
        ...metric,
        dropOffRate: Number(dropOff.toFixed(2)),
      };
    });

    return { funnel: withDropOff };
  }

  /**
   * Get abandonment analysis
   */
  async getAbandonmentMetrics(timeRange?: string) {
    const dateFilter = this.getDateFilter(timeRange);

    const abandonedSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.endReason = :reason', { reason: 'ABANDONED' })
      .andWhere('session.startedAt >= :startDate', dateFilter)
      .getCount();

    const abandonmentEvents = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.eventType = :eventType', {
        eventType: CheckoutEventType.CHECKOUT_ABANDONED,
      })
      .andWhere('event.occurredAt >= :startDate', dateFilter)
      .select('COALESCE(event.step::text, :unknown)', 'step')
      .addSelect('COUNT(event.id)', 'count')
      .setParameter('unknown', 'UNKNOWN')
      .groupBy('COALESCE(event.step::text, :unknown)')
      .orderBy('COUNT(event.id)', 'DESC')
      .getRawMany<{ step: string; count: string }>();

    return {
      totalAbandoned: abandonedSessions,
      byStep: abandonmentEvents.map((item) => ({
        step: item.step,
        count: Number(item.count),
      })),
    };
  }

  /**
   * Get payment method success rates
   */
  async getPaymentMethodMetrics(timeRange?: string) {
    const dateFilter = this.getDateFilter(timeRange);

    const results = await this.eventRepository
      .createQueryBuilder('event')
      .where(
        'event.eventType IN (:...types)',
        {
          types: [
            CheckoutEventType.PAYMENT_SUCCEEDED,
            CheckoutEventType.PAYMENT_FAILED,
          ],
        },
      )
      .andWhere('event.occurredAt >= :startDate', dateFilter)
      .select('COALESCE(event."payment_method"::text, :unknown)', 'method')
      .addSelect('event."event_type"::text', 'type')
      .addSelect('COUNT(event.id)', 'count')
      .setParameter('unknown', 'UNKNOWN')
      .groupBy('COALESCE(event."payment_method"::text, :unknown)')
      .addGroupBy('event."event_type"::text')
      .getRawMany<{ method: string; type: string; count: string }>();

    const methods = [
      CheckoutEventPaymentMethod.PIX,
      CheckoutEventPaymentMethod.CARD,
      CheckoutEventPaymentMethod.CRYPTO,
    ];

    const metrics = methods.map((method) => {
      const succeeded = results.find(
        (r) => r.method === method && r.type === CheckoutEventType.PAYMENT_SUCCEEDED,
      );
      const failed = results.find(
        (r) => r.method === method && r.type === CheckoutEventType.PAYMENT_FAILED,
      );

      const successCount = Number(succeeded?.count ?? 0);
      const failedCount = Number(failed?.count ?? 0);
      const attempts = successCount + failedCount;

      return {
        method,
        attempts,
        success: successCount,
        failed: failedCount,
        successRate: attempts > 0 ? (successCount / attempts) * 100 : 0,
      };
    });

    return { methods: metrics };
  }

  /**
   * Get time-series metrics for charts
   */
  async getTimeSeriesMetrics(
    metric: 'conversions' | 'sessions' | 'abandonments',
    timeRange: string = '24h',
    interval: string = 'hour',
  ) {
    const dateFilter = this.getDateFilter(timeRange);
    const truncFormat = interval === 'hour' ? 'hour' : 'day';

    // Map metric to event type and aggregation
    const metricConfig = {
      conversions: {
        eventType: CheckoutEventType.PAYMENT_SUCCEEDED,
        groupBy: 'sessionId',
      },
      sessions: {
        eventType: CheckoutEventType.CHECKOUT_SESSION_STARTED,
        groupBy: 'sessionId',
      },
      abandonments: {
        eventType: CheckoutEventType.CHECKOUT_ABANDONED,
        groupBy: 'id',
      },
    };

    const config = metricConfig[metric];

    const results = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.eventType = :eventType', { eventType: config.eventType })
      .andWhere('event.occurredAt >= :startDate', dateFilter)
      .select(`TO_CHAR(DATE_TRUNC('${truncFormat}', event.occurredAt), 'YYYY-MM-DD HH24:MI:SS')`, 'time')
      .addSelect(
        config.groupBy === 'sessionId'
          ? 'COUNT(DISTINCT event.sessionId)'
          : 'COUNT(event.id)',
        'value',
      )
      .groupBy(`DATE_TRUNC('${truncFormat}', event.occurredAt)`)
      .orderBy(`DATE_TRUNC('${truncFormat}', event.occurredAt)`, 'ASC')
      .getRawMany<{ time: string; value: string }>();

    return {
      metric,
      timeRange,
      interval,
      data: results.map((r) => ({
        time: r.time,
        value: Number(r.value),
      })),
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
            startDate = new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
            break;
        }
      }
    }

    return { startDate };
  }
}
