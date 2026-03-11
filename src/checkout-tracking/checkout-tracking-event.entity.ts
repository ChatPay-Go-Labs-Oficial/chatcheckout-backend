import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';
import {
  CheckoutEventPaymentMethod,
  CheckoutEventSource,
  CheckoutEventStep,
  CheckoutEventType,
} from './checkout-tracking.enums';
import { CheckoutTrackingSession } from './checkout-tracking-session.entity';

@Entity('checkout_tracking_events')
export class CheckoutTrackingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => CheckoutTrackingSession)
  @JoinColumn({ name: 'session_id' })
  session: CheckoutTrackingSession;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @Column({ name: 'event_type', type: 'enum', enum: CheckoutEventType })
  eventType: CheckoutEventType;

  @Column({ name: 'step', type: 'enum', enum: CheckoutEventStep, nullable: true })
  step: CheckoutEventStep | null;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: CheckoutEventPaymentMethod,
    nullable: true,
  })
  paymentMethod: CheckoutEventPaymentMethod | null;

  @Column({ name: 'status', type: 'varchar', length: 50, nullable: true })
  status: string | null;

  @Column({
    name: 'source',
    type: 'enum',
    enum: CheckoutEventSource,
    default: CheckoutEventSource.FRONTEND,
  })
  source: CheckoutEventSource;

  @Column({ name: 'occurred_at', type: 'timestamp' })
  occurredAt: Date;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
