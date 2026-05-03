import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';

@Entity('ai_usage_logs')
@Index('idx_ai_usage_seller_month', ['sellerId', 'createdAt'])
export class AiUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'session_id', length: 64 })
  sessionId: string;

  @Column({ name: 'tokens_in', type: 'int' })
  tokensIn: number;

  @Column({ name: 'tokens_out', type: 'int' })
  tokensOut: number;

  @Column({ name: 'model_used', length: 50 })
  modelUsed: string;

  @Column({ name: 'knowledge_source', length: 20 })
  knowledgeSource: 'faq' | 'rag' | 'scraping' | 'fallback';

  @Column({ name: 'cost_usd', type: 'numeric', precision: 10, scale: 8 })
  costUsd: number;

  @Column({ name: 'latency_ms', type: 'int', nullable: true })
  latencyMs: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller: User;
}
