import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStripeCustomerIdToOrders1733337484000 implements MigrationInterface {
  name = 'AddStripeCustomerIdToOrders1733337484000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a coluna já existe antes de adicionar
    const table = await queryRunner.getTable('orders');
    const columnNames = table?.columns.map((col) => col.name) || [];

    if (!columnNames.includes('stripe_customer_id')) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'stripe_customer_id',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );

      // Criar índice para melhorar performance de queries
      await queryRunner.query(
        `CREATE INDEX "idx_orders_stripe_customer_id" ON "orders" ("stripe_customer_id")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');
    const columnNames = table?.columns.map((col) => col.name) || [];

    if (columnNames.includes('stripe_customer_id')) {
      // Remover índice
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_stripe_customer_id"`);

      // Remover coluna
      await queryRunner.dropColumn('orders', 'stripe_customer_id');
    }
  }
}
