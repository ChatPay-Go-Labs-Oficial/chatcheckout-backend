import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiBadRequestResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { InitCryptoTransactionDto } from './dto/init-crypto-transaction.dto';
import { MarkCryptoSubmittedDto } from './dto/mark-crypto-submitted.dto';
import { MarkCryptoCompleteDto } from './dto/mark-crypto-complete.dto';
import { MarkCryptoFailedDto } from './dto/mark-crypto-failed.dto';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('account-session')
  @ApiOperation({ summary: 'Create a Stripe Account Session for embedded onboarding' })
  @ApiResponse({
    status: 201,
    description: 'Account session created successfully.',
    schema: { example: { clientSecret: 'eas_123...' } },
  })
  @ApiBadRequestResponse({ description: 'Seller is not ready to receive payments.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async createAccountSession(@Request() req) {
    return this.paymentService.createAccountSession(req.user.userId);
  }

  @Post('create-intent')
  @ApiOperation({ summary: 'Create a Payment Intent for a product' })
  @ApiResponse({
    status: 201,
    description: 'Payment Intent created successfully.',
    schema: {
      example: {
        clientSecret: 'pi_123_secret_456',
        orderId: 'uuid',
        qrCode: 'https://...',
        pixCode: '00020126580014br.gov.bcb.pix...',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Seller is not ready to receive payments or invalid payload.',
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiBody({ type: CreatePaymentIntentDto })
  async createPaymentIntent(@Body() body: CreatePaymentIntentDto) {
    return this.paymentService.createPaymentIntent(
      body.productId,
      'anonymous',
      body.paymentMethod,
      body.customerData,
    );
  }

  @Post('crypto/init')
  @ApiOperation({ summary: 'Initialize a crypto transaction and order' })
  @ApiResponse({
    status: 201,
    description: 'Crypto transaction initialized successfully.',
    schema: {
      example: {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        orderRef: 'crypto_16d40c27-7967-4ca8-9e1e-7874be6e1453',
        sellerWallet: 'CA7KSUEHPBPOY2Z253B5IFY6E6H6JYQ5VL5GEUXLIYRDTX4PTSFMSVKV',
        status: 'PENDING',
      },
    },
  })
  @ApiBody({ type: InitCryptoTransactionDto })
  initCryptoTransaction(@Body() body: InitCryptoTransactionDto) {
    return this.paymentService.initCryptoTransaction(body);
  }

  @Post('crypto/submitted')
  @ApiOperation({ summary: 'Mark crypto transaction as submitted on-chain' })
  @ApiResponse({ status: 201, description: 'Crypto transaction submission registered.' })
  @ApiBody({ type: MarkCryptoSubmittedDto })
  markCryptoSubmitted(@Body() body: MarkCryptoSubmittedDto) {
    return this.paymentService.markCryptoSubmitted(body);
  }

  @Post('crypto/complete')
  @ApiOperation({ summary: 'Mark crypto transaction as completed' })
  @ApiResponse({ status: 201, description: 'Crypto transaction completed.' })
  @ApiBody({ type: MarkCryptoCompleteDto })
  markCryptoComplete(@Body() body: MarkCryptoCompleteDto) {
    return this.paymentService.markCryptoCompleted(body);
  }

  @Post('crypto/fail')
  @ApiOperation({ summary: 'Mark crypto transaction as failed' })
  @ApiResponse({ status: 201, description: 'Crypto transaction failed.' })
  @ApiBody({ type: MarkCryptoFailedDto })
  markCryptoFailed(@Body() body: MarkCryptoFailedDto) {
    return this.paymentService.markCryptoFailed(body);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Stripe Webhooks' })
  @ApiHeader({
    name: 'stripe-signature',
    required: true,
    description: 'Stripe webhook signature header used to validate the payload.',
    schema: { type: 'string' },
  })
  @ApiResponse({ status: 201, description: 'Webhook processed.' })
  @ApiBadRequestResponse({
    description: 'Missing signature or raw body for webhook verification.',
  })
  async handleWebhook(@Headers('stripe-signature') signature: string, @Request() req: any) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body is required for webhook verification');
    }

    await this.paymentService.handleStripeWebhook(signature, rawBody);

    return { received: true };
  }
}
