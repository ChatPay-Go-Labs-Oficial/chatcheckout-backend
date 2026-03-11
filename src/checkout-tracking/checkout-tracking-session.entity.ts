import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';
import { CheckoutSessionEndReason } from './checkout-tracking.enums';
import { CheckoutTrackingEvent } from './checkout-tracking-event.entity';

@Entity('checkout_tracking_sessions')
export class CheckoutTrackingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'product_hash' })
  productHash: string;

  @Column({ name: 'tracking_token_hash', length: 64, unique: true })
  trackingTokenHash: string;

  @Column({ name: 'started_at', type: 'timestamp', default: () => 'now()' })
  startedAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamp', default: () => 'now()' })
  lastSeenAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({
    name: 'end_reason',
    type: 'enum',
    enum: CheckoutSessionEndReason,
    nullable: true,
  })
  endReason: CheckoutSessionEndReason | null;

  @Column({ name: 'ip_hash', type: 'varchar', length: 64, nullable: true })
  ipHash: string | null;

  @Column({ name: 'user_agent_hash', type: 'varchar', length: 64, nullable: true })
  userAgentHash: string | null;

  @OneToMany(() => CheckoutTrackingEvent, (event) => event.session)
  events: CheckoutTrackingEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
