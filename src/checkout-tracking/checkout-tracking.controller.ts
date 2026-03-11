import { Body, Controller, Headers, Ip, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CheckoutTrackingService } from './checkout-tracking.service';
import { StartCheckoutTrackingSessionDto } from './dto/start-checkout-tracking-session.dto';
import { TrackCheckoutEventDto } from './dto/track-checkout-event.dto';
import { CheckoutTrackingHeartbeatDto } from './dto/checkout-tracking-heartbeat.dto';

@ApiTags('checkout-tracking')
@Controller('checkout-tracking')
export class CheckoutTrackingController {
  constructor(private readonly checkoutTrackingService: CheckoutTrackingService) {}

  @Post('session')
  @ApiOperation({ summary: 'Start checkout tracking session' })
  @ApiBody({ type: StartCheckoutTrackingSessionDto })
  @ApiResponse({
    status: 201,
    description: 'Tracking session started successfully',
    schema: {
      example: {
        sessionId: '51c173d5-f819-4bbf-b8a0-e3b24f0ef74d',
        trackingToken: '35c2f4...',
        expiresAt: '2026-03-03T14:00:00.000Z',
      },
    },
  })
  async startSession(
    @Body() dto: StartCheckoutTrackingSessionDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.checkoutTrackingService.startSession(
      dto,
      ip,
      typeof userAgent === 'string' ? userAgent : undefined,
    );
  }

  @Post('event')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track checkout event from frontend' })
  @ApiBody({ type: TrackCheckoutEventDto })
  @ApiResponse({ status: 201, description: 'Event accepted' })
  async trackEvent(
    @Body() dto: TrackCheckoutEventDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.checkoutTrackingService.trackFrontendEvent(dto, authorization);
  }

  @Post('heartbeat')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh checkout tracking session keepalive' })
  @ApiBody({ type: CheckoutTrackingHeartbeatDto })
  @ApiResponse({ status: 201, description: 'Heartbeat accepted' })
  async heartbeat(
    @Body() dto: CheckoutTrackingHeartbeatDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.checkoutTrackingService.heartbeat(dto.sessionId, authorization);
  }
}
