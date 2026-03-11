import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CheckoutMetricsService } from '../services/checkout.metrics.service';
import { PaymentMetricsService } from '../services/payment.metrics.service';
import { PerformanceMetricsService } from '../services/performance.metrics.service';

/**
 * Observability Controller
 *
 * Provides business metrics and observability endpoints for monitoring.
 * Leverages existing event tables for business observability.
 *
 * All endpoints require authentication (Bearer token).
 */
@ApiTags('observability')
@ApiBearerAuth()
@Controller('observability/metrics')
export class ObservabilityController {
  constructor(
    private readonly checkoutMetrics: CheckoutMetricsService,
    private readonly paymentMetrics: PaymentMetricsService,
    private readonly performanceMetrics: PerformanceMetricsService,
  ) {}

  /**
   * Get checkout conversion metrics
   */
  @Get('checkout')
  @ApiOperation({
    summary: 'Get checkout conversion metrics',
    description: 'Returns conversion rate, sessions, and successful checkouts',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  async getCheckoutMetrics(@Query('timeRange') timeRange?: string) {
    return this.checkoutMetrics.getConversionMetrics(timeRange);
  }

  /**
   * Get checkout funnel analysis
   */
  @Get('checkout/funnel')
  @ApiOperation({
    summary: 'Get checkout funnel analysis',
    description: 'Returns funnel stages with drop-off rates',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  async getCheckoutFunnel(@Query('timeRange') timeRange?: string) {
    return this.checkoutMetrics.getFunnelMetrics(timeRange);
  }

  /**
   * Get checkout abandonment metrics
   */
  @Get('checkout/abandonment')
  @ApiOperation({
    summary: 'Get checkout abandonment metrics',
    description: 'Returns abandonment data by checkout step',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  async getCheckoutAbandonment(@Query('timeRange') timeRange?: string) {
    return this.checkoutMetrics.getAbandonmentMetrics(timeRange);
  }

  /**
   * Get payment method metrics
   */
  @Get('checkout/payment-methods')
  @ApiOperation({
    summary: 'Get payment method metrics',
    description: 'Returns success rates by payment method (PIX, CARD, CRYPTO)',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  async getPaymentMethodMetrics(@Query('timeRange') timeRange?: string) {
    return this.checkoutMetrics.getPaymentMethodMetrics(timeRange);
  }

  /**
   * Get time series metrics for charts
   */
  @Get('checkout/timeseries')
  @ApiOperation({
    summary: 'Get time series metrics',
    description: 'Returns time-series data for conversions, sessions, or abandonments',
  })
  @ApiQuery({ name: 'metric', required: true, enum: ['conversions', 'sessions', 'abandonments'] })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  @ApiQuery({ name: 'interval', required: false, enum: ['hour', 'day'], example: 'hour' })
  async getTimeSeriesMetrics(
    @Query('metric') metric: 'conversions' | 'sessions' | 'abandonments',
    @Query('timeRange') timeRange: string = '24h',
    @Query('interval') interval: string = 'hour',
  ) {
    return this.checkoutMetrics.getTimeSeriesMetrics(metric, timeRange, interval);
  }

  /**
   * Get payment metrics
   */
  @Get('payments')
  @ApiOperation({
    summary: 'Get payment metrics',
    description: 'Returns overall payment metrics including success/failure rates',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  async getPaymentMetrics(@Query('timeRange') timeRange?: string) {
    return this.paymentMetrics.getPaymentMetrics(timeRange);
  }

  /**
   * Get payment method breakdown
   */
  @Get('payments/breakdown')
  @ApiOperation({
    summary: 'Get payment method breakdown',
    description: 'Returns detailed breakdown by payment method and status',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  async getPaymentMethodBreakdown(@Query('timeRange') timeRange?: string) {
    return this.paymentMetrics.getPaymentMethodBreakdown(timeRange);
  }

  /**
   * Get payment time series
   */
  @Get('payments/timeseries')
  @ApiOperation({
    summary: 'Get payment time series',
    description: 'Returns time-series data for completed payments',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  @ApiQuery({ name: 'interval', required: false, enum: ['hour', 'day'], example: 'hour' })
  async getPaymentTimeSeries(
    @Query('timeRange') timeRange: string = '24h',
    @Query('interval') interval: string = 'hour',
  ) {
    return this.paymentMetrics.getPaymentTimeSeries(timeRange, interval);
  }

  /**
   * Get average order value
   */
  @Get('payments/aov')
  @ApiOperation({
    summary: 'Get average order value',
    description: 'Returns AOV metrics including min/max values',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  async getAverageOrderValue(@Query('timeRange') timeRange?: string) {
    return this.paymentMetrics.getAverageOrderValue(timeRange);
  }

  /**
   * Get performance metrics
   */
  @Get('performance')
  @ApiOperation({
    summary: 'Get performance metrics',
    description: 'Returns response time percentiles (P50, P95, P99)',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  async getPerformanceMetrics(@Query('timeRange') timeRange?: string) {
    return this.performanceMetrics.getResponseTimeMetrics(timeRange);
  }

  /**
   * Get checkout flow metrics
   */
  @Get('performance/flow')
  @ApiOperation({
    summary: 'Get checkout flow metrics',
    description: 'Returns checkout flow duration metrics',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  async getCheckoutFlowMetrics(@Query('timeRange') timeRange?: string) {
    return this.performanceMetrics.getCheckoutFlowMetrics(timeRange);
  }

  /**
   * Get error rate metrics
   */
  @Get('performance/errors')
  @ApiOperation({
    summary: 'Get error rate metrics',
    description: 'Returns error rates by checkout step',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  async getErrorRateMetrics(@Query('timeRange') timeRange?: string) {
    return this.performanceMetrics.getErrorRateMetrics(timeRange);
  }

  /**
   * Get performance summary
   */
  @Get('performance/summary')
  @ApiOperation({
    summary: 'Get performance summary',
    description: 'Returns overall performance summary across all metrics',
  })
  @ApiQuery({ name: 'timeRange', required: false, example: '24h', description: 'Time range (e.g., 24h, 7d, 4w)' })
  async getPerformanceSummary(@Query('timeRange') timeRange?: string) {
    return this.performanceMetrics.getPerformanceSummary(timeRange);
  }
}
