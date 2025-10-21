import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'joao.silva@exemplo.com',
    description: 'E-mail do usuário para login',
  })
  @IsEmail({}, { message: 'E-mail deve ter um formato válido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @ApiProperty({
    example: 'MinhaSenh@123',
    description: 'Senha do usuário',
  })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  password: string;
}
