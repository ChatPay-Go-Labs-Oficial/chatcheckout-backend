import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsStellarPublicKey } from '../../common';

export class UpsertUserWalletDto {
  @ApiProperty({
    example: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    description: 'Stellar wallet address (G... for account or C... for smart account)',
  })
  @IsString()
  @IsNotEmpty()
  @IsStellarPublicKey()
  walletAddress: string;
}
