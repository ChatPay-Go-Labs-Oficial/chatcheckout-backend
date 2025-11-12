import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from 'src/user/user.entity';

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

  @Column({ nullable: false })
  productHash: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;
}
