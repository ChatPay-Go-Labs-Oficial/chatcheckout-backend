import { ApiProperty } from '@nestjs/swagger';

export class InfoproducerInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ required: false })
  companyName?: string;
}

export class ProductDecodeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  salesPageUrl: string;

  @ApiProperty({ required: false })
  imageUrl?: string;

  @ApiProperty({ required: false })
  promptAi?: string;

  @ApiProperty({ required: false, nullable: true })
  productHash: string | null;

  @ApiProperty({ type: InfoproducerInfoDto })
  infoproducer: InfoproducerInfoDto;
}
