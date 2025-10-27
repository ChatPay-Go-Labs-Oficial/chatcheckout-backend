import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
  @ApiOperation({
    summary: 'Autenticar vendedor',
    description:
      'Realiza login usando e-mail, CPF ou CNPJ e retorna tokens JWT (access e refresh). Limite: 5 tentativas por minuto.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Login realizado com sucesso. Retorna access_token, refresh_token e dados do usuário',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'joao.silva@exemplo.com',
          firstName: 'João',
          lastName: 'Silva',
          role: 'infoproducer',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Dados de entrada inválidos (formato incorreto de email, CPF ou CNPJ)',
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciais inválidas (usuário não encontrado ou senha incorreta)',
  })
  @ApiTooManyRequestsResponse({
    description: 'Muitas tentativas de login. Tente novamente em alguns instantes.',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 renovações por minuto
  @ApiOperation({
    summary: 'Renovar access token',
    description:
      'Renova o access token usando um refresh token válido. Limite: 10 renovações por minuto.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token renovado com sucesso',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token inválido ou expirado',
  })
  @ApiTooManyRequestsResponse({
    description: 'Muitas tentativas de renovação. Tente novamente em alguns instantes.',
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Realizar logout',
    description:
      'Invalida o token (access ou refresh) adicionando-o à blacklist. O token não poderá mais ser usado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
    schema: {
      example: {
        message: 'Logout realizado com sucesso',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Token não fornecido ou inválido',
  })
  async logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }
}
