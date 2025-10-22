import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import * as bcrypt from 'bcrypt';
import { IdentifierDetector, IdentifierType } from '../common';
import { TokenBlacklistService } from './token-blacklist.service';

/**
 * Interface para resposta de login
 */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

/**
 * Interface para resposta de refresh
 */
export interface RefreshResponse {
  access_token: string;
}

/**
 * Payload do JWT
 */
export interface JwtPayload {
  sub: string;
  email: string;
  firstName: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  /**
   * Busca usuário por identificador (email, CPF ou CNPJ)
   * @param identifier - Email, CPF ou CNPJ
   * @returns Usuário encontrado ou null
   */
  private async findUserByIdentifier(identifier: string): Promise<User | null> {
    const detection = IdentifierDetector.detect(identifier);

    if (!detection.isValid) {
      return null;
    }

    switch (detection.type) {
      case IdentifierType.EMAIL:
        return this.userRepository.findOne({ where: { email: detection.cleanValue } });

      case IdentifierType.CPF:
        return this.userRepository.findOne({ where: { cpf: detection.cleanValue } });

      case IdentifierType.CNPJ:
        return this.userRepository.findOne({ where: { cnpj: detection.cleanValue } });

      default:
        return null;
    }
  }

  /**
   * Valida as credenciais do usuário
   * @param identifier - Email, CPF ou CNPJ
   * @param password - Senha
   * @returns Usuário validado
   * @throws UnauthorizedException se credenciais inválidas
   */
  async validateUser(identifier: string, password: string): Promise<User> {
    const user = await this.findUserByIdentifier(identifier);

    // Sempre usar a mesma mensagem para não vazar informações
    if (!user) {
      this.logger.warn(`Tentativa de login falhou: usuário não encontrado`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      this.logger.warn(`Tentativa de login falhou para usuário ID: ${user.id}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return user;
  }

  /**
   * Cria o payload do JWT
   * @param user - Usuário autenticado
   * @returns Payload do JWT
   */
  private createJwtPayload(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      role: user.role,
    };
  }

  /**
   * Realiza o login do usuário
   * @param dto - Dados de login
   * @returns Tokens JWT e informações do usuário
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateUser(dto.identifier, dto.password);
    const payload = this.createJwtPayload(user);

    return {
      access_token: this.jwtService.sign(payload as any),
      refresh_token: this.jwtService.sign(payload as any, { expiresIn: '7d' }),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Renova o access token usando o refresh token
   * @param dto - Refresh token
   * @returns Novo access token
   * @throws UnauthorizedException se refresh token inválido
   */
  async refreshToken(dto: RefreshTokenDto): Promise<RefreshResponse> {
    try {
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(dto.refresh_token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token foi revogado');
      }

      const payload = this.jwtService.verify<JwtPayload>(dto.refresh_token);

      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      const newPayload = this.createJwtPayload(user);

      return {
        access_token: this.jwtService.sign(newPayload as any),
      };
    } catch {
      this.logger.warn(`Tentativa de refresh com token inválido`);
      throw new UnauthorizedException('Token de refresh inválido ou expirado');
    }
  }

  /**
   * Realiza logout do usuário invalidando o token
   * @param dto - Token a ser invalidado
   */
  async logout(dto: LogoutDto): Promise<{ message: string }> {
    try {
      await this.tokenBlacklistService.addToBlacklist(dto.token);

      return {
        message: 'Logout realizado com sucesso',
      };
    } catch (error) {
      this.logger.error(`Failed to add token to blacklist: ${error}`);
      return {
        message: 'Logout realizado com sucesso',
      };
    }
  }
}
