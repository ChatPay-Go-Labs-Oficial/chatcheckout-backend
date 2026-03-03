import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { Product } from '../product/product.entity';
import { CheckoutTrackingSession } from './checkout-tracking-session.entity';
import { CheckoutTrackingEvent } from './checkout-tracking-event.entity';
import {
  CheckoutEventPaymentMethod,
  CheckoutEventSource,
  CheckoutEventType,
  CheckoutSessionEndReason,
} from './checkout-tracking.enums';
import { StartCheckoutTrackingSessionDto } from './dto/start-checkout-tracking-session.dto';
import { TrackCheckoutEventDto } from './dto/track-checkout-event.dto';

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const METADATA_MAX_KEYS = 50;
const METADATA_MAX_STR_LEN = 500;

@Injectable()
export class CheckoutTrackingService {
  constructor(
    @InjectRepository(CheckoutTrackingSession)
    private readonly sessionRepository: Repository<CheckoutTrackingSession>,
    @InjectRepository(CheckoutTrackingEvent)
    private readonly eventRepository: Repository<CheckoutTrackingEvent>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async startSession(
    dto: StartCheckoutTrackingSessionDto,
    ip?: string,
    userAgent?: string,
  ): Promise<{ sessionId: string; trackingToken: string; expiresAt: string }> {
    const product = await this.productRepository.findOne({
      where: { productHash: dto.productHash },
      relations: ['user'],
    });

    if (!product?.user?.id) {
      throw new NotFoundException('Product not found');
    }

    const trackingToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashValue(trackingToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    const session = await this.sessionRepository.save(
      this.sessionRepository.create({
        productId: product.id,
        sellerId: product.user.id,
        productHash: dto.productHash,
        trackingTokenHash: tokenHash,
        startedAt: now,
        lastSeenAt: now,
        expiresAt,
        ipHash: ip ? this.hashValue(ip) : null,
        userAgentHash: userAgent ? this.hashValue(userAgent) : null,
      }),
    );

    await this.eventRepository.save(
      this.eventRepository.create({
        sessionId: session.id,
        sellerId: session.sellerId,
        productId: session.productId,
        eventType: CheckoutEventType.CHECKOUT_SESSION_STARTED,
        source: CheckoutEventSource.BACKEND,
        occurredAt: now,
        metadata: { origin: 'session_start' },
      }),
    );

    return {
      sessionId: session.id,
      trackingToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async trackFrontendEvent(dto: TrackCheckoutEventDto, authorizationHeader?: string) {
    const session = await this.validateSessionAccess(dto.sessionId, authorizationHeader);

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Invalid occurredAt date');
    }

    if (dto.eventType === CheckoutEventType.CHECKOUT_ABANDONED) {
      const existingAbandonment = await this.eventRepository.findOne({
        where: {
          sessionId: session.id,
          eventType: CheckoutEventType.CHECKOUT_ABANDONED,
        },
      });

      if (existingAbandonment) {
        return { accepted: true };
      }
    }

    await this.eventRepository.save(
      this.eventRepository.create({
        sessionId: session.id,
        sellerId: session.sellerId,
        productId: session.productId,
        orderId: dto.orderId ?? null,
        eventType: dto.eventType,
        step: dto.step ?? null,
        paymentMethod: dto.paymentMethod ?? null,
        status: dto.status ?? null,
        source: CheckoutEventSource.FRONTEND,
        occurredAt,
        metadata: this.sanitizeMetadata(dto.metadata ?? null),
      }),
    );

    const endedAt =
      dto.eventType === CheckoutEventType.PAYMENT_SUCCEEDED ||
      dto.eventType === CheckoutEventType.PAYMENT_FAILED ||
      dto.eventType === CheckoutEventType.CHECKOUT_ABANDONED;

    await this.sessionRepository.update(session.id, {
      lastSeenAt: new Date(),
      ...(endedAt
        ? {
            endedAt: new Date(),
            endReason:
              dto.eventType === CheckoutEventType.PAYMENT_SUCCEEDED
                ? CheckoutSessionEndReason.SUCCESS
                : dto.eventType === CheckoutEventType.CHECKOUT_ABANDONED
                  ? CheckoutSessionEndReason.ABANDONED
                  : CheckoutSessionEndReason.FAILED,
          }
        : {}),
    });

    return { accepted: true };
  }

  async heartbeat(sessionId: string, authorizationHeader?: string) {
    const session = await this.validateSessionAccess(sessionId, authorizationHeader);
    await this.sessionRepository.update(session.id, {
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return { accepted: true };
  }

  async recordBackendEvent(params: {
    productId: string;
    sellerId: string;
    orderId?: string;
    eventType: CheckoutEventType;
    status?: string;
    paymentMethod?: CheckoutEventPaymentMethod;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: {
        productId: params.productId,
        sellerId: params.sellerId,
        endedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });

    if (!session) {
      return;
    }

    await this.eventRepository.save(
      this.eventRepository.create({
        sessionId: session.id,
        sellerId: session.sellerId,
        productId: session.productId,
        orderId: params.orderId ?? null,
        eventType: params.eventType,
        paymentMethod: params.paymentMethod ?? null,
        status: params.status ?? null,
        source: CheckoutEventSource.BACKEND,
        occurredAt: new Date(),
        metadata: this.sanitizeMetadata(params.metadata ?? null),
      }),
    );

    if (params.eventType === CheckoutEventType.PAYMENT_SUCCEEDED) {
      await this.sessionRepository.update(session.id, {
        endedAt: new Date(),
        endReason: CheckoutSessionEndReason.SUCCESS,
      });
    }

    if (params.eventType === CheckoutEventType.PAYMENT_FAILED) {
      await this.sessionRepository.update(session.id, {
        endedAt: new Date(),
        endReason: CheckoutSessionEndReason.FAILED,
      });
    }
  }

  private async validateSessionAccess(
    sessionId: string,
    authorizationHeader?: string,
  ): Promise<CheckoutTrackingSession> {
    const token = this.extractBearerToken(authorizationHeader);
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException('Tracking session not found');
    }

    if (session.expiresAt < new Date()) {
      await this.sessionRepository.update(session.id, {
        endedAt: session.endedAt ?? new Date(),
        endReason: session.endReason ?? CheckoutSessionEndReason.EXPIRED,
      });
      throw new UnauthorizedException('Tracking session expired');
    }

    const tokenHash = this.hashValue(token);
    if (tokenHash !== session.trackingTokenHash) {
      throw new UnauthorizedException('Invalid tracking token');
    }

    return session;
  }

  private extractBearerToken(authorizationHeader?: string): string {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const [scheme, token] = authorizationHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    return token;
  }

  private sanitizeMetadata(
    metadata: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!metadata) {
      return null;
    }

    const entries = Object.entries(metadata).slice(0, METADATA_MAX_KEYS);
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of entries) {
      sanitized[key] = this.sanitizeMetadataValue(key, value);
    }

    return sanitized;
  }

  private sanitizeMetadataValue(key: string, value: unknown): unknown {
    const lowerKey = key.toLowerCase();
    const shouldHash =
      lowerKey.includes('email') ||
      lowerKey.includes('cpf') ||
      lowerKey.includes('phone') ||
      lowerKey.includes('whatsapp') ||
      lowerKey.includes('wallet');

    if (shouldHash) {
      return typeof value === 'string' ? `sha256:${this.hashValue(value)}` : null;
    }

    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      return value.length > METADATA_MAX_STR_LEN ? value.slice(0, METADATA_MAX_STR_LEN) : value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.slice(0, 20).map((item) => this.sanitizeMetadataValue(key, item));
    }

    if (typeof value === 'object') {
      const objectEntries = Object.entries(value).slice(0, 20);
      const result: Record<string, unknown> = {};
      for (const [objKey, objValue] of objectEntries) {
        result[objKey] = this.sanitizeMetadataValue(objKey, objValue);
      }
      return result;
    }

    return null;
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
