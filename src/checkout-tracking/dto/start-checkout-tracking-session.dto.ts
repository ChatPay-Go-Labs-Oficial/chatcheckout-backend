import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StartCheckoutTrackingSessionDto {
  @ApiProperty({
    description: 'Public product hash from checkout URL',
    example: 'a1b2c3d4e5f6',
  })
  @IsString()
  @IsNotEmpty()
  productHash: string;
}
