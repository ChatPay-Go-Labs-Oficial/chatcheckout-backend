import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface ProductHashData {
  productUrl: string;
  promptAI: string;
}

@Injectable()
export class ProductHashService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(private configService: ConfigService) {
    const secret = this.configService.get<string>('PRODUCT_HASH_SECRET');
    if (!secret) {
      throw new Error('PRODUCT_HASH_SECRET is not defined in environment variables');
    }
    // Generate key and IV from secret
    this.key = crypto.scryptSync(secret, 'salt', 32);
    this.iv = Buffer.alloc(16, 0); // Use a fixed IV for consistent hashing
  }

  generateHash(productUrl: string, promptAi: string | null): string {
    const data: ProductHashData = {
      productUrl: productUrl || '',
      promptAI: promptAi || '',
    };

    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decodeHash(hash: string): ProductHashData {
    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
      let decrypted = decipher.update(hash, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Invalid hash or decryption failed');
    }
  }
}
