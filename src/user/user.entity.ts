import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from './user-role.enum';

@Entity('users')
@Index(['email'])
@Index(['cpf'])
@Index(['cnpj'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  @Exclude()
  password_hash: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ unique: true, length: 11 })
  cpf: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.Client,
  })
  role: UserRole;

  @Column({ name: 'company_name', nullable: true, length: 200 })
  companyName?: string;

  @Column({ unique: true, nullable: true, length: 14 })
  cnpj?: string;

  @Column({ name: 'stripe_account_id', nullable: true })
  stripeAccountId?: string;

  @Column({ name: 'stripe_onboarding_completed', default: false })
  stripeOnboardingCompleted: boolean;

  @Column({ type: 'varchar', name: 'crypto_wallet_address', nullable: true, length: 56 })
  cryptoWalletAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
