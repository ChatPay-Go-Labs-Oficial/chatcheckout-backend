export class InfoproducerInfoDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
}

export class ProductDecodeResponseDto {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  salesPageUrl: string;
  imageUrl?: string;
  promptAi?: string;
  productHash: string;
  infoproducer: InfoproducerInfoDto;
}
