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
