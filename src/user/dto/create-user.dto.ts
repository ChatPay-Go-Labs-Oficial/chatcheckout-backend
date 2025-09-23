import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../user-role.enum';

export class CreateUserDto {
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  cpf: string;

  @ApiProperty()
  password: string;

  @ApiProperty({ enum: UserRole, default: UserRole.Client })
  role: UserRole;

  @ApiProperty({ required: false })
  companyName?: string;

  @ApiProperty({ required: false })
  cnpj?: string;
}
