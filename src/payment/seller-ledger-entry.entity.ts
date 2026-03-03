import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';

export enum SellerLedgerEntryType {
  SALE_CREDIT = 'SALE_CREDIT',
  PLATFORM_FEE = 'PLATFORM_FEE',
  REFUND_DEBIT = 'REFUND_DEBIT',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('seller_ledger_entries')
export class SellerLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: SellerLedgerEntryType,
  })
  type: SellerLedgerEntryType;

  @Column()
  amount: number; // in cents

  @Column({ name: 'currency' })
  currency: string;

  @Column({ name: 'balance_after' })
  balanceAfter: number; // in cents

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
