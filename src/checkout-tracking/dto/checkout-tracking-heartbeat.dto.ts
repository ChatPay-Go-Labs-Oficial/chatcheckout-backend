import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CheckoutTrackingHeartbeatDto {
  @ApiProperty({ format: 'uuid', description: 'Tracking session id' })
  @IsUUID()
  sessionId: string;
}
