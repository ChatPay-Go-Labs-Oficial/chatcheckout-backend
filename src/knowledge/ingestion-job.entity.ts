import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';

export enum IngestionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('ingestion_jobs')
export class IngestionJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  @Index('idx_ingestion_jobs_product_id')
  productId: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'r2_key', length: 512 })
  r2Key: string;

  @Column({ name: 'original_name', length: 255 })
  originalName: string;

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: number;

  @Column({
    type: 'enum',
    enum: IngestionStatus,
    default: IngestionStatus.PENDING,
  })
  @Index('idx_ingestion_jobs_status')
  status: IngestionStatus;

  @Column({ name: 'chunks_created', type: 'int', nullable: true })
  chunksCreated: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller: User;
}
