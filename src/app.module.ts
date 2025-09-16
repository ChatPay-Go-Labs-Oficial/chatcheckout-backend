import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';
import { MerchantModule } from './merchant/merchant.module';
import { UserModule } from './user/user.module';
import { ChatAiModule } from './chat-ai/chat-ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: true, // NOTE: Set to false in production
    }),
    AuthModule,
    UserModule,
    MerchantModule,
    ProductModule,
    ChatAiModule,
  ],
})
export class AppModule {}
