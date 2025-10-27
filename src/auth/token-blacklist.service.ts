import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../config/redis.service';

/**
 * Serviço para gerenciar blacklist de tokens JWT
 *
 * @description
 * Utiliza Redis para armazenar tokens invalidados (logout).
 * Quando um usuário faz logout, o token é adicionado à blacklist
 * e não pode mais ser usado até expirar naturalmente.
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Adiciona um token à blacklist
   * @param token - Token JWT a ser invalidado
   * @param ttl - Time to live em segundos (opcional, será calculado automaticamente)
   */
  async addToBlacklist(token: string, ttl?: number): Promise<void> {
    const key = `blacklist:${token}`;
    let finalTtl = ttl;

    // Se não informar TTL, calcula baseado na expiração do token
    if (!finalTtl) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decoded: any = this.jwtService.decode(token);
        if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
          const now = Math.floor(Date.now() / 1000);
          finalTtl = (decoded.exp as number) - now;
        }
      } catch (error) {
        this.logger.warn('Failed to decode token, using default TTL');
        finalTtl = 60 * 60 * 24 * 7; // 7 dias
      }
    }

    // Garante que tenha um TTL válido
    if (!finalTtl || finalTtl <= 0) {
      finalTtl = 60 * 60 * 24 * 7; // 7 dias
    }

    await this.redisService.setex(key, finalTtl, 'revoked');
    this.logger.log(`Token added to blacklist with TTL: ${finalTtl}s`);
  }

  /**
   * Verifica se um token está na blacklist
   * @param token - Token JWT a ser verificado
   * @returns true se o token está revogado, false caso contrário
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    const result = await this.redisService.get(key);
    return result === 'revoked';
  }

  /**
   * Remove um token da blacklist (geralmente não necessário, pois expira automaticamente)
   * @param token - Token a ser removido
   */
  async removeFromBlacklist(token: string): Promise<void> {
    const key = `blacklist:${token}`;
    await this.redisService.del(key);
    this.logger.log('Token removed from blacklist');
  }
}
