import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY not defined');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover' as any,
    });
  }

  async createAccount(email: string): Promise<Stripe.Account> {
    return this.stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        pix_payments: { requested: true },
      },
    });
  }

  async createAccountSession(accountId: string): Promise<string> {
    const accountSession = await this.stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });
    return accountSession.client_secret;
  }

  async findOrCreateCustomer(
    email: string,
    data: { name: string; phone: string; cpf: string },
  ): Promise<Stripe.Customer> {
    // Buscar customer existente por email
    const existingCustomers = await this.stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Criar novo customer
    return this.stripe.customers.create({
      email,
      name: data.name,
      phone: data.phone,
      metadata: {
        cpf: data.cpf,
      },
    });
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    destinationAccountId: string,
    feeAmount: number,
    paymentMethod?: 'pix' | 'card' | 'crypto',
    customerId?: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    const paymentMethodTypes: string[] = [];
    
    if (paymentMethod === 'pix') {
      paymentMethodTypes.push('pix');
    } else if (paymentMethod === 'card') {
      paymentMethodTypes.push('card');
    } else {
      // Default: enable both
      paymentMethodTypes.push('card', 'pix');
    }

    const intentData: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      payment_method_types: paymentMethodTypes,
      application_fee_amount: feeAmount,
      on_behalf_of: destinationAccountId,
      transfer_data: {
        destination: destinationAccountId,
      },
    };

    // Adicionar customer se fornecido
    if (customerId) {
      intentData.customer = customerId;
    }

    // Adicionar metadata se fornecido
    if (metadata) {
      intentData.metadata = metadata;
    }

    // Remove automatic_payment_methods when using specific payment_method_types
    if (paymentMethodTypes.length === 0) {
      intentData.automatic_payment_methods = { enabled: true };
    }

    return this.stripe.paymentIntents.create(intentData);
  }

  constructEventFromPayload(signature: string, payload: Buffer): Stripe.Event {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not defined');
    }
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
}
