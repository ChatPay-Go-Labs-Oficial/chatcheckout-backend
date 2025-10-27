import { Module, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { RedisService } from './redis.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD');
        const db = configService.get<number>('REDIS_DB', 0);

        const store = await redisStore({
          host,
          port,
          password,
          db,
        });

        logger.log(`Cache store configured: ${host}:${port}`);

        return {
          store,
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [CacheModule, RedisService],
})
export class RedisModule {}
