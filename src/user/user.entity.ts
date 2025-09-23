import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { UserRole } from './user-role.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  cpf: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.Client })
  role: UserRole;

  @Column({ nullable: true })
  companyName?: string;

  @Column({ nullable: true })
  cnpj?: string;
}
