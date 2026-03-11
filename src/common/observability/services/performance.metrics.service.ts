import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckoutTrackingEvent } from '../../../checkout-tracking/checkout-tracking-event.entity';
import { CheckoutTrackingSession } from '../../../checkout-tracking/checkout-tracking-session.entity';
import { CheckoutEventType } from '../../../checkout-tracking/checkout-tracking.enums';

/**
 * Performance Metrics Service
 *
 * Provides performance metrics from checkout tracking events.
 * Analyzes response times, step durations, and system performance.
 */
@Injectable()
export class PerformanceMetricsService {
  constructor(
    @InjectRepository(CheckoutTrackingEvent)
    private readonly eventRepository: Repository<CheckoutTrackingEvent>,
    @InjectRepository(CheckoutTrackingSession)
    private readonly sessionRepository: Repository<CheckoutTrackingSession>,
  ) {}

  /**
   * Get response time percentiles
   */
  async getResponseTimeMetrics(timeRange?: string) {
    const dateFilter = this.getDateFilter(timeRange);

    // Get all events with metadata containing duration
    const events = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.occurredAt >= :startDate', dateFilter)
      .andWhere('event.metadata ? :key', { key: 'duration' })
      .select('event.metadata', 'metadata')
      .getMany();

    const durations = events
      .map((e) => {
        const duration = e.metadata?.duration;
        return typeof duration === 'number' ? duration : null;
      })
      .filter((d): d is number => d !== null);

    if (durations.length === 0) {
      return {
        count: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        average: 0,
      };
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const getPercentile = (p: number) =>
      sorted[Math.floor((p / 100) * sorted.length)] || 0;

    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count: sorted.length,
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
      average: sum / sorted.length,
    };
  }

  /**
   * Get checkout flow duration metrics
   */
  async getCheckoutFlowMetrics(timeRange?: string) {
    const dateFilter = this.getDateFilter(timeRange);

    // Get completed sessions with duration
    const sessions = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.startedAt >= :startDate', dateFilter)
      .andWhere('session.endedAt IS NOT NULL')
      .select([
        'session.id',
        'session.startedAt',
        'session.endedAt',
        'session.endReason',
      ])
      .getMany();

    const durations = sessions
      .map((s) => {
        if (s.startedAt && s.endedAt) {
          return s.endedAt.getTime() - s.startedAt.getTime();
        }
        return null;
      })
      .filter((d): d is number => d !== null);

    if (durations.length === 0) {
      return {
        completedSessions: 0,
        averageDurationMs: 0,
        medianDurationMs: 0,
        p95DurationMs: 0,
      };
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      completedSessions: sorted.length,
      averageDurationMs: Math.round(sum / sorted.length),
      medianDurationMs: sorted[Math.floor(sorted.length / 2)] || 0,
      p95DurationMs: sorted[Math.floor(sorted.length * 0.95)] || 0,
    };
  }

  /**
   * Get error rates by endpoint/type
   */
  async getErrorRateMetrics(timeRange?: string) {
    const dateFilter = this.getDateFilter(timeRange);

    const errorEvents = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.occurredAt >= :startDate', dateFilter)
      .andWhere('event.eventType = :eventType', {
        eventType: CheckoutEventType.PAYMENT_FAILED,
      })
      .select('event.step', 'step')
      .addSelect('COUNT(event.id)', 'count')
      .groupBy('event.step')
      .orderBy('COUNT(event.id)', 'DESC')
      .getRawMany<{ step: string | null; count: string }>();

    const totalErrors = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.occurredAt >= :startDate', dateFilter)
      .andWhere('event.eventType = :eventType', {
        eventType: CheckoutEventType.PAYMENT_FAILED,
      })
      .getCount();

    const totalEvents = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.occurredAt >= :startDate', dateFilter)
      .getCount();

    return {
      totalErrors,
      totalEvents,
      errorRate: totalEvents > 0 ? (totalErrors / totalEvents) * 100 : 0,
      errorsByStep: errorEvents.map((e) => ({
        step: e.step || 'UNKNOWN',
        count: Number(e.count),
        percentage: totalErrors > 0 ? (Number(e.count) / totalErrors) * 100 : 0,
      })),
    };
  }

  /**
   * Get system performance summary
   */
  async getPerformanceSummary(timeRange?: string) {
    const [responseTimes, flowDurations, errorRates] = await Promise.all([
      this.getResponseTimeMetrics(timeRange),
      this.getCheckoutFlowMetrics(timeRange),
      this.getErrorRateMetrics(timeRange),
    ]);

    return {
      responseTime: {
        average: responseTimes.average,
        p50: responseTimes.p50,
        p95: responseTimes.p95,
        p99: responseTimes.p99,
      },
      checkoutFlow: {
        averageDurationMs: flowDurations.averageDurationMs,
        medianDurationMs: flowDurations.medianDurationMs,
        p95DurationMs: flowDurations.p95DurationMs,
      },
      errors: {
        totalErrors: errorRates.totalErrors,
        errorRate: errorRates.errorRate,
      },
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
