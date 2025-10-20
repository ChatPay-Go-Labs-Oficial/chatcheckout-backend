import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../user-role.enum';
import {
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';
import { PasswordMatch } from '../validators/password-match.validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'João',
    description: 'Nome do vendedor',
  })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(50, { message: 'Nome deve ter no máximo 50 caracteres' })
  firstName: string;

  @ApiProperty({
    example: 'Silva',
    description: 'Sobrenome do vendedor',
  })
  @IsNotEmpty({ message: 'Sobrenome é obrigatório' })
  @MaxLength(50, { message: 'Sobrenome deve ter no máximo 50 caracteres' })
  lastName: string;

  @ApiProperty({
    example: 'joao.silva@exemplo.com',
    description: 'E-mail único do vendedor',
  })
  @IsEmail({}, { message: 'E-mail deve ter um formato válido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @ApiProperty({
    example: '12345678901',
    description: 'CPF único do vendedor (11 dígitos)',
  })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Matches(/^\d{11}$/, { message: 'CPF deve conter exatamente 11 dígitos numéricos' })
  cpf: string;

  @ApiProperty({
    example: 'MinhaSenh@123',
    description: 'Senha forte com pelo menos 8 caracteres',
  })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Senha deve conter ao menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
  })
  password: string;

  @ApiProperty({
    example: 'MinhaSenh@123',
    description: 'Confirmação da senha (deve ser idêntica à senha)',
  })
  @IsNotEmpty({ message: 'Confirmação de senha é obrigatória' })
  @PasswordMatch('password')
  confirmPassword: string;

  @ApiProperty({
    enum: UserRole,
    default: UserRole.Infoproducer,
    description: 'Papel do usuário na plataforma',
  })
  @IsEnum(UserRole, { message: 'Papel de usuário inválido' })
  role: UserRole;

  @ApiProperty({
    required: false,
    example: 'Minha Empresa LTDA',
    description: 'Nome da empresa (opcional)',
  })
  @IsOptional()
  @MaxLength(100, { message: 'Nome da empresa deve ter no máximo 100 caracteres' })
  companyName?: string;

  @ApiProperty({
    required: false,
    example: '12345678000195',
    description: 'CNPJ da empresa (14 dígitos, opcional)',
  })
  @IsOptional()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve conter exatamente 14 dígitos numéricos' })
  cnpj?: string;
}
