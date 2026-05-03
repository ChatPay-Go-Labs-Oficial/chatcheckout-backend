import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';

export enum Currency {
  BRL = 'BRL',
  XLM = 'XLM',
  USDC = 'USDC',
}

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  description: string;

  @Column('decimal', { nullable: false })
  price: number;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({ nullable: false })
  salesPageUrl: string;

  @Column({ nullable: true })
  promptAi: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: false })
  productUrl: string;

  @Column({ type: 'varchar', nullable: true })
  productHash: string | null;

  @Column({ name: 'crypto_payments_enabled', default: false })
  cryptoPaymentsEnabled: boolean;

  @Column({ name: 'knowledge_ready', default: false })
  knowledgeReady: boolean;

  @Column({ name: 'knowledge_updated_at', type: 'timestamptz', nullable: true })
  knowledgeUpdatedAt: Date | null;

  @Column({ name: 'ebook_r2_key', type: 'varchar', nullable: true })
  ebookR2Key: string | null;

  @ManyToOne(() => User, { nullable: false })
  user: User;
}
