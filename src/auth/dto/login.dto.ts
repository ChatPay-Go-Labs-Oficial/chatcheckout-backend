import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'joao.silva@exemplo.com',
    description: 'Identificador do usuário: pode ser e-mail, CPF (11 dígitos) ou CNPJ (14 dígitos)',
    examples: {
      email: {
        value: 'joao.silva@exemplo.com',
        summary: 'Login com e-mail',
      },
      cpf: {
        value: '12345678901',
        summary: 'Login com CPF',
      },
      cnpj: {
        value: '12345678000195',
        summary: 'Login com CNPJ',
      },
    },
  })
  @IsNotEmpty({ message: 'Identificador é obrigatório' })
  @IsString({ message: 'Identificador deve ser uma string' })
  identifier: string;

  @ApiProperty({
    example: 'MinhaSenh@123',
    description: 'Senha do usuário',
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(1, { message: 'Senha não pode estar vazia' })
  password: string;
}
