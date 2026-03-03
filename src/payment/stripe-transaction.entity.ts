import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../order/order.entity';

export enum StripeTransactionStatus {
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('stripe_transactions')
export class StripeTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'stripe_payment_intent_id', unique: true })
  stripePaymentIntentId: string;

  @Column({ name: 'stripe_customer_id', type: 'varchar', nullable: true })
  stripeCustomerId: string | null;

  @Column({ name: 'amount' })
  amount: number; // in cents

  @Column({ name: 'fee_amount' })
  feeAmount: number; // in cents

  @Column({
    type: 'enum',
    enum: StripeTransactionStatus,
    default: StripeTransactionStatus.PAYMENT_PENDING,
  })
  status: StripeTransactionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
