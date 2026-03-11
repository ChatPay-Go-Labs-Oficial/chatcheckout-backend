import { Controller, Get, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { CheckoutDashboardQueryDto } from './dto/checkout-dashboard-query.dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('checkout/summary')
  @ApiOperation({ summary: 'Get checkout summary metrics for authenticated seller' })
  @ApiResponse({ status: 200, description: 'Summary returned successfully' })
  async getCheckoutSummary(@Req() req: Request, @Query() query: CheckoutDashboardQueryDto) {
    const sellerId = this.extractSellerId(req);
    return this.dashboardService.getCheckoutSummary(sellerId, query);
  }

  @Get('checkout/funnel')
  @ApiOperation({ summary: 'Get checkout funnel stages for authenticated seller' })
  @ApiResponse({ status: 200, description: 'Funnel returned successfully' })
  async getCheckoutFunnel(@Req() req: Request, @Query() query: CheckoutDashboardQueryDto) {
    const sellerId = this.extractSellerId(req);
    return this.dashboardService.getCheckoutFunnel(sellerId, query);
  }

  @Get('checkout/abandonment')
  @ApiOperation({ summary: 'Get checkout abandonment insights for authenticated seller' })
  @ApiResponse({ status: 200, description: 'Abandonment returned successfully' })
  async getCheckoutAbandonment(@Req() req: Request, @Query() query: CheckoutDashboardQueryDto) {
    const sellerId = this.extractSellerId(req);
    return this.dashboardService.getCheckoutAbandonment(sellerId, query);
  }

  @Get('checkout/payments-breakdown')
  @ApiOperation({
    summary: 'Get payment method success/failure breakdown for authenticated seller',
  })
  @ApiResponse({ status: 200, description: 'Breakdown returned successfully' })
  async getPaymentsBreakdown(@Req() req: Request, @Query() query: CheckoutDashboardQueryDto) {
    const sellerId = this.extractSellerId(req);
    return this.dashboardService.getPaymentsBreakdown(sellerId, query);
  }

  @Get('checkout/daily-sales')
  @ApiOperation({ summary: 'Get daily sales data for authenticated seller' })
  @ApiResponse({ status: 200, description: 'Daily sales returned successfully' })
  async getDailySales(@Req() req: Request, @Query() query: CheckoutDashboardQueryDto) {
    const sellerId = this.extractSellerId(req);
    return this.dashboardService.getDailySales(sellerId, query);
  }

  private extractSellerId(req: Request): string {
    if (!req.user || !('userId' in req.user)) {
      throw new UnauthorizedException('User not authenticated');
    }
    return (req.user as { userId: string }).userId;
  }
}
