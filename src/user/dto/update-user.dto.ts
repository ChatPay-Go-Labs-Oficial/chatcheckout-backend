import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../user-role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  password?: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  cpf?: string;

  @ApiPropertyOptional({ enum: UserRole })
  role?: UserRole;

  @ApiPropertyOptional()
  companyName?: string;

  @ApiPropertyOptional()
  cnpj?: string;
}
