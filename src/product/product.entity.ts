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

  @Column()
  name: string;

  @Column('decimal')
  price: number;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column()
  description: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;
}
