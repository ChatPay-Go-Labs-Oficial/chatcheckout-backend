import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCryptoWalletAddressToUsers1773000000000 implements MigrationInterface {
  name = 'AddCryptoWalletAddressToUsers1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "crypto_wallet_address" character varying(56)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_crypto_wallet_address_not_null" ON "users" ("crypto_wallet_address") WHERE "crypto_wallet_address" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_users_crypto_wallet_address_not_null"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "crypto_wallet_address"`);
  }
}
