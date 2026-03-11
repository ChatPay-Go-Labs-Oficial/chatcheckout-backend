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

export enum TokenSymbol {
  USDC = 'USDC',
  XLM = 'XLM',
}

export enum CryptoTransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum PlanType {
  STARTER = 'STARTER',
  ELITE = 'ELITE',
}

@Entity('crypto_transactions')
export class CryptoTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'attempt_number' })
  attemptNumber: number;

  @Column({ name: 'order_ref', unique: true })
  orderRef: string;

  @Column({ name: 'buyer_wallet' })
  buyerWallet: string;

  @Column({ name: 'seller_wallet' })
  sellerWallet: string;

  @Column({ name: 'amount_token', type: 'decimal', precision: 18, scale: 8 })
  amountToken: string;

  @Column({ name: 'amount_fiat', type: 'decimal', precision: 10, scale: 2 })
  amountFiat: string;

  @Column({
    name: 'token_symbol',
    type: 'enum',
    enum: TokenSymbol,
  })
  tokenSymbol: TokenSymbol;

  @Column({
    name: 'plan_type',
    type: 'enum',
    enum: PlanType,
    nullable: true,
  })
  planType: PlanType | null;

  @Column({ name: 'blockchain_hash', type: 'varchar', nullable: true })
  blockchainHash: string | null;

  @Column({ name: 'unlock_timestamp', type: 'bigint', nullable: true })
  unlockTimestamp: string | null;

  @Column({ name: 'unlock_date', type: 'timestamp', nullable: true })
  unlockDate: Date | null;

  @Column({ name: 'network' })
  network: string;

  @Column({
    type: 'enum',
    enum: CryptoTransactionStatus,
    default: CryptoTransactionStatus.PENDING,
  })
  status: CryptoTransactionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
