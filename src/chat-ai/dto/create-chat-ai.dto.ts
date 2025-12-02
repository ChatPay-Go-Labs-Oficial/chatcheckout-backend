import { IsString, IsNotEmpty } from 'class-validator';

export class CreateChatAiDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  productHash: string;
}
