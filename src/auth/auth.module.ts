import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { TokenBlacklistService } from './token-blacklist.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../user/user.entity';
import { RedisModule } from '../config/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    RedisModule,
  ],
  providers: [AuthService, JwtStrategy, TokenBlacklistService, JwtAuthGuard],
  controllers: [AuthController],
  exports: [TokenBlacklistService, JwtAuthGuard],
})
export class AuthModule {}
