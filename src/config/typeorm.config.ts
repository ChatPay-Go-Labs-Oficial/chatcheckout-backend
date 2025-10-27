import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'chatcheckout',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  synchronize: false, // NUNCA usar true em produção
  logging: process.env.NODE_ENV === 'development',
  migrationsTableName: 'migrations_history',
};

// DataSource para uso pelo CLI de migrations
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
