import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  password?: string;
}