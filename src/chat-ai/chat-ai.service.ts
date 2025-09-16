import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CreateChatAiDto } from './dto/create-chat-ai.dto';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class ChatAiService {
  private readonly apiUrl = 'https://chat-checkout-ai.onrender.com/chat';
  private readonly bearerToken = 'hack_meridian_2025_vamoooooo';

  constructor(private readonly httpService: HttpService) {}

  async message(createChatAiDto: CreateChatAiDto) {
    const headers = {
      Authorization: `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
    };

    const response: AxiosResponse = await firstValueFrom(
      this.httpService.post(this.apiUrl, createChatAiDto, { headers }),
    );

    return response.data;
  }
}
