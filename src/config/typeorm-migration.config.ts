import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { dataSourceOptions } from './typeorm.config';

config();

import { join } from 'path';

console.log('Migrations path:', join(__dirname, '..', 'migrations', '*.ts'));

export default new DataSource({
  ...dataSourceOptions,
  entities: [join(__dirname, '..', '**', '*.entity.ts')],
  migrations: [join(__dirname, '..', 'migrations', '*.ts')],
});
