import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CreateChatAiDto } from './dto/create-chat-ai.dto';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ProductHashService } from '../product/product-hash.service';

@Injectable()
export class ChatAiService {
  private readonly apiUrl = process.env.PYTHON_API_URL!;
  private readonly bearerToken = process.env.PYTHON_API_BEARER_TOKEN!;

  constructor(
    private readonly httpService: HttpService,
    private readonly productHashService: ProductHashService,
  ) {}

  async message(createChatAiDto: CreateChatAiDto) {
    const headers = {
      Authorization: `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
    };

    const decodedHash = this.productHashService.decodeHash(createChatAiDto.productHash);

    const payload = {
      message: createChatAiDto.message,
      productUrl: decodedHash.productUrl,
      promptAI: decodedHash.promptAI,
    };

    const response: AxiosResponse = await firstValueFrom(
      this.httpService.post(this.apiUrl, payload, { headers }),
    );

    return response.data;
  }
}
