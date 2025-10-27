import { SkipThrottle, Throttle } from '@nestjs/throttler';

/**
 * Desabilita rate limiting para uma rota específica
 *
 * @example
 * ```typescript
 * @SkipThrottle()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export { SkipThrottle };

/**
 * Define limites personalizados de rate limiting para uma rota
 *
 * @param limit - Número máximo de requisições
 * @param ttl - Tempo em milissegundos para resetar o contador
 *
 * @example
 * ```typescript
 * // Permitir apenas 3 tentativas de login por minuto
 * @Throttle({ default: { limit: 3, ttl: 60000 } })
 * @Post('login')
 * login(@Body() dto: LoginDto) {
 *   return this.authService.login(dto);
 * }
 * ```
 */
export { Throttle };
