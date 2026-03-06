import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripePaymentMethodType1773000000000 implements MigrationInterface {
  name = 'AddStripePaymentMethodType1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."stripe_transactions_payment_method_type_enum" AS ENUM('PIX', 'CARD')`);
    await queryRunner.query(
      `ALTER TABLE "stripe_transactions" ADD COLUMN "payment_method_type" "public"."stripe_transactions_payment_method_type_enum" NOT NULL DEFAULT 'CARD'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stripe_transactions" DROP COLUMN "payment_method_type"`);
    await queryRunner.query(`DROP TYPE "public"."stripe_transactions_payment_method_type_enum"`);
  }
}
