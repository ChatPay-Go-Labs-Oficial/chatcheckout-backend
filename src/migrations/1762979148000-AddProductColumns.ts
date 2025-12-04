import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProductColumns1762979148000 implements MigrationInterface {
  name = 'AddProductColumns1762979148000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se as colunas já existem antes de adicionar
    const table = await queryRunner.getTable('product');
    const columnNames = table?.columns.map((col) => col.name) || [];

    if (!columnNames.includes('name')) {
      await queryRunner.addColumn(
        'product',
        new TableColumn({
          name: 'name',
          type: 'varchar',
          isNullable: false,
        }),
      );
    }

    if (!columnNames.includes('description')) {
      await queryRunner.addColumn(
        'product',
        new TableColumn({
          name: 'description',
          type: 'varchar',
          isNullable: false,
        }),
      );
    }

    if (!columnNames.includes('price')) {
      await queryRunner.addColumn(
        'product',
        new TableColumn({
          name: 'price',
          type: 'decimal',
          isNullable: false,
        }),
      );
    }

    if (!columnNames.includes('currency')) {
      await queryRunner.query(
        `CREATE TYPE "public"."product_currency_enum" AS ENUM('BRL', 'XLM', 'USDC')`,
      );
      await queryRunner.addColumn(
        'product',
        new TableColumn({
          name: 'currency',
          type: 'enum',
          enum: ['BRL', 'XLM', 'USDC'],
          isNullable: false,
        }),
      );
    }

    if (!columnNames.includes('salesPageUrl')) {
      await queryRunner.addColumn(
        'product',
        new TableColumn({
          name: 'salesPageUrl',
          type: 'varchar',
          isNullable: false,
        }),
      );
    }

    if (!columnNames.includes('promptAi')) {
      await queryRunner.addColumn(
        'product',
        new TableColumn({
          name: 'promptAi',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    if (!columnNames.includes('imageUrl')) {
      await queryRunner.addColumn(
        'product',
        new TableColumn({
          name: 'imageUrl',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    if (!columnNames.includes('productUrl')) {
      await queryRunner.addColumn(
        'product',
        new TableColumn({
          name: 'productUrl',
          type: 'varchar',
          isNullable: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('product');
    const columnNames = table?.columns.map((col) => col.name) || [];

    if (columnNames.includes('productUrl')) {
      await queryRunner.dropColumn('product', 'productUrl');
    }

    if (columnNames.includes('imageUrl')) {
      await queryRunner.dropColumn('product', 'imageUrl');
    }

    if (columnNames.includes('promptAi')) {
      await queryRunner.dropColumn('product', 'promptAi');
    }

    if (columnNames.includes('salesPageUrl')) {
      await queryRunner.dropColumn('product', 'salesPageUrl');
    }

    if (columnNames.includes('currency')) {
      await queryRunner.dropColumn('product', 'currency');
      await queryRunner.query(`DROP TYPE "public"."product_currency_enum"`);
    }

    if (columnNames.includes('price')) {
      await queryRunner.dropColumn('product', 'price');
    }

    if (columnNames.includes('description')) {
      await queryRunner.dropColumn('product', 'description');
    }

    if (columnNames.includes('name')) {
      await queryRunner.dropColumn('product', 'name');
    }
  }
}
