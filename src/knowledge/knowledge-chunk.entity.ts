import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';

@Entity('knowledge_chunks')
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  @Index('idx_knowledge_chunks_product_id')
  productId: string;

  @Column({ name: 'seller_id' })
  @Index('idx_knowledge_chunks_seller_id')
  sellerId: string;

  @Column('text', { name: 'chunk_text' })
  chunkText: string;

  @Column({ name: 'chunk_index' })
  chunkIndex: number;

  @Column({ name: 'source_type', length: 20 })
  sourceType: 'ebook_pdf' | 'faq' | 'landing_page';

  @Column({ name: 'source_meta', type: 'jsonb', nullable: true })
  sourceMeta: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;
}
