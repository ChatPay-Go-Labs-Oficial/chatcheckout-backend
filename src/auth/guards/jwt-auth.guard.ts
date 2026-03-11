import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenBlacklistService } from '../token-blacklist.service';

/**
 * Guard JWT customizado que verifica blacklist automaticamente
 *
 * @description
 * Este guard estende o AuthGuard padrão do Passport e adiciona
 * verificação automática de blacklist em TODAS as requisições protegidas.
 *
 * Uso:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * async minhaRota() { ... }
 * ```
 *
 * O guard automaticamente:
 * 1. Valida o JWT (assinatura, expiração)
 * 2. Verifica se o token está na blacklist
 * 3. Se tudo OK, permite acesso
 * 4. Se blacklisted ou inválido, rejeita com 401
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly tokenBlacklistService: TokenBlacklistService) {
    super();
  }

  /**
   * Intercepta a requisição antes de validar o JWT
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Primeiro, valida o JWT normalmente (assinatura, expiração)
    const isValid = await super.canActivate(context);

    if (!isValid) {
      return false;
    }

    // 2. Extrai o token do header
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token não fornecido');
    }

    // 3. Verifica se o token está na blacklist
    const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(token);

    if (isBlacklisted) {
      throw new UnauthorizedException('Token foi revogado. Faça login novamente.');
    }

    // 4. Tudo OK, permite acesso
    return true;
  }

  /**
   * Extrai o token do header Authorization
   */
  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  /**
   * Customiza a mensagem de erro para o usuário
   */
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido ou expirado');
    }
    return user;
  }
}
