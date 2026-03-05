import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCryptoPlanTypeNullable1773000100000 implements MigrationInterface {
  name = 'MakeCryptoPlanTypeNullable1773000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "crypto_transactions" ALTER COLUMN "plan_type" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "crypto_transactions" SET "plan_type" = 'STARTER' WHERE "plan_type" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "crypto_transactions" ALTER COLUMN "plan_type" SET NOT NULL`,
    );
  }
}
