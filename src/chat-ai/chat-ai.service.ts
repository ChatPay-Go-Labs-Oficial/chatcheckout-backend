import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CreateChatAiDto } from './dto/create-chat-ai.dto';
import { firstValueFrom } from 'rxjs';
import { ProductHashService } from '../product/product-hash.service';
import type { Response } from 'express';

@Injectable()
export class ChatAiService {
  private readonly apiUrl = process.env.PYTHON_INFERENCE_URL!;
  private readonly bearerToken = process.env.PYTHON_API_BEARER_TOKEN!;

  constructor(
    private readonly httpService: HttpService,
    private readonly productHashService: ProductHashService,
  ) {}

  async streamMessage(createChatAiDto: CreateChatAiDto, res: Response) {
    const headers = {
      Authorization: `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
    };

    const decodedHash = this.productHashService.decodeHash(createChatAiDto.productHash);

    const payload = {
      product_id: decodedHash.productId,
      seller_id: decodedHash.userId,
      message: createChatAiDto.message,
      session_id: createChatAiDto.sessionId,
      prompt_ai: decodedHash.promptAI,
    };

    try {
      // Faz requisição com responseType 'stream' para receber streaming real
      const response = await firstValueFrom(
        this.httpService.post(this.apiUrl, payload, {
          headers,
          responseType: 'stream',
        }),
      );

      // Processa streaming real da API Python conforme chunks chegam
      let buffer = '';

      const stream = response.data as NodeJS.ReadableStream;
      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n\n');

        // Mantém a última linha incompleta no buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawContent = line.substring(6);
            const trimmed = rawContent.trim();
            if (trimmed && trimmed !== '[DONE]' && trimmed !== '[ERROR]') {
              // Filtra lixo técnico da API Python
              if (
                trimmed === 'None' ||
                trimmed.includes('buscar_conteudo_completo_site') ||
                trimmed.includes('completed in')
              ) {
                continue;
              }

              // Reenvia preservando espaços originais dos tokens do LLM
              res.write(`data: ${rawContent}\n\n`);
            }
          }
        }
      });

      stream.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });

      stream.on('error', () => {
        res.write('data: [ERROR]\n\n');
        res.end();
      });
    } catch {
      res.write('data: [ERROR]\n\n');
      res.end();
    }
  }
}
