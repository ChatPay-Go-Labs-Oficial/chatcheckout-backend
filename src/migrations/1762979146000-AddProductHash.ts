import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProductHash1762979146000 implements MigrationInterface {
  name = 'AddProductHash1762979146000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'product',
      new TableColumn({
        name: 'productHash',
        type: 'varchar',
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('product', 'productHash');
  }
}
