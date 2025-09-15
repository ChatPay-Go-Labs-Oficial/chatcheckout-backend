import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    // testa conexão com o banco
    await this.dataSource.query('SELECT 1');
    return { status: 'ok' };
  }
}
