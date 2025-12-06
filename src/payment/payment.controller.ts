import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StripeService } from '../stripe/stripe.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly stripeService: StripeService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('account-session')
  @ApiOperation({ summary: 'Create a Stripe Account Session for embedded onboarding' })
  @ApiResponse({
    status: 201,
    description: 'Account session created successfully.',
    schema: { example: { clientSecret: 'eas_123...' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
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
  @ApiResponse({ status: 201, description: 'Webhook processed.' })
  @ApiResponse({ status: 400, description: 'Missing signature.' })
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
