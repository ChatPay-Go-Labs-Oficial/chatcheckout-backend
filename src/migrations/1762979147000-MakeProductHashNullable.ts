import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeProductHashNullable1762979147000 implements MigrationInterface {
  name = 'MakeProductHashNullable1762979147000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" ALTER COLUMN "productHash" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" ALTER COLUMN "productHash" SET NOT NULL`);
  }
}
