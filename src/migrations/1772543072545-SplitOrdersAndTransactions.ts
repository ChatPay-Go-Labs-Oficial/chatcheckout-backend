import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitOrdersAndTransactions1772543072545 implements MigrationInterface {
  name = 'SplitOrdersAndTransactions1772543072545';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."orders_payment_method_enum" AS ENUM('STRIPE', 'CRYPTO')`,
    );

    await queryRunner.query(`ALTER TABLE "orders" RENAME COLUMN "amount" TO "total_amount"`);

    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" RENAME VALUE 'PENDING' TO 'CREATED'`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "payment_method" "public"."orders_payment_method_enum" NOT NULL DEFAULT 'STRIPE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "attempt_count" integer NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."stripe_transactions_status_enum" AS ENUM('PAYMENT_PENDING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stripe_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "stripe_payment_intent_id" character varying NOT NULL,
        "stripe_customer_id" character varying,
        "amount" integer NOT NULL,
        "fee_amount" integer NOT NULL,
        "status" "public"."stripe_transactions_status_enum" NOT NULL DEFAULT 'PAYMENT_PENDING',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_stripe_transactions_payment_intent" UNIQUE ("stripe_payment_intent_id"),
        CONSTRAINT "PK_stripe_transactions_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."crypto_transactions_token_symbol_enum" AS ENUM('USDC', 'XLM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."crypto_transactions_plan_type_enum" AS ENUM('STARTER', 'ELITE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."crypto_transactions_status_enum" AS ENUM('PENDING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "crypto_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "attempt_number" integer NOT NULL,
        "order_ref" character varying NOT NULL,
        "buyer_wallet" character varying NOT NULL,
        "seller_wallet" character varying NOT NULL,
        "amount_token" numeric(18,8) NOT NULL,
        "amount_fiat" numeric(10,2) NOT NULL,
        "token_symbol" "public"."crypto_transactions_token_symbol_enum" NOT NULL,
        "plan_type" "public"."crypto_transactions_plan_type_enum" NOT NULL,
        "blockchain_hash" character varying,
        "unlock_timestamp" bigint,
        "unlock_date" TIMESTAMP,
        "network" character varying NOT NULL,
        "status" "public"."crypto_transactions_status_enum" NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_crypto_transactions_order_ref" UNIQUE ("order_ref"),
        CONSTRAINT "PK_crypto_transactions_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."seller_ledger_entries_type_enum" AS ENUM('SALE_CREDIT', 'PLATFORM_FEE', 'REFUND_DEBIT', 'ADJUSTMENT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "seller_ledger_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "seller_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "type" "public"."seller_ledger_entries_type_enum" NOT NULL,
        "amount" integer NOT NULL,
        "currency" character varying NOT NULL,
        "balance_after" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_seller_ledger_entries_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "stripe_transactions" ADD CONSTRAINT "FK_stripe_transactions_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "crypto_transactions" ADD CONSTRAINT "FK_crypto_transactions_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_ledger_entries" ADD CONSTRAINT "FK_seller_ledger_entries_seller" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_ledger_entries" ADD CONSTRAINT "FK_seller_ledger_entries_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `INSERT INTO "stripe_transactions" (
        "order_id",
        "stripe_payment_intent_id",
        "stripe_customer_id",
        "amount",
        "fee_amount",
        "status",
        "created_at",
        "updated_at"
      )
      SELECT
        o."id",
        o."stripe_payment_intent_id",
        o."stripe_customer_id",
        o."total_amount",
        o."fee_amount",
        CASE
          WHEN o."status"::text = 'CREATED' THEN 'PAYMENT_PENDING'
          WHEN o."status"::text = 'COMPLETED' THEN 'COMPLETED'
          ELSE 'FAILED'
        END::"public"."stripe_transactions_status_enum",
        o."created_at",
        o."updated_at"
      FROM "orders" o
      WHERE o."stripe_payment_intent_id" IS NOT NULL`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_stripe_customer_id"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "UQ_db623beca8ff9ede5d7d45a9bdc"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "stripe_customer_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "stripe_payment_intent_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "stripe_payment_intent_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "stripe_customer_id" character varying`,
    );

    await queryRunner.query(
      `WITH latest_stripe_tx AS (
        SELECT DISTINCT ON (st."order_id")
          st."order_id",
          st."stripe_payment_intent_id",
          st."stripe_customer_id"
        FROM "stripe_transactions" st
        ORDER BY st."order_id", st."created_at" DESC
      )
      UPDATE "orders" o
      SET
        "stripe_payment_intent_id" = lst."stripe_payment_intent_id",
        "stripe_customer_id" = lst."stripe_customer_id"
      FROM latest_stripe_tx lst
      WHERE o."id" = lst."order_id"`,
    );

    await queryRunner.query(
      `UPDATE "orders"
      SET "stripe_payment_intent_id" = 'legacy-' || "id"::text
      WHERE "stripe_payment_intent_id" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "stripe_payment_intent_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_db623beca8ff9ede5d7d45a9bdc" UNIQUE ("stripe_payment_intent_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_stripe_customer_id" ON "orders" ("stripe_customer_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "seller_ledger_entries" DROP CONSTRAINT "FK_seller_ledger_entries_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_ledger_entries" DROP CONSTRAINT "FK_seller_ledger_entries_seller"`,
    );
    await queryRunner.query(
      `ALTER TABLE "crypto_transactions" DROP CONSTRAINT "FK_crypto_transactions_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stripe_transactions" DROP CONSTRAINT "FK_stripe_transactions_order"`,
    );

    await queryRunner.query(`DROP TABLE "seller_ledger_entries"`);
    await queryRunner.query(`DROP TYPE "public"."seller_ledger_entries_type_enum"`);

    await queryRunner.query(`DROP TABLE "crypto_transactions"`);
    await queryRunner.query(`DROP TYPE "public"."crypto_transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."crypto_transactions_plan_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."crypto_transactions_token_symbol_enum"`);

    await queryRunner.query(`DROP TABLE "stripe_transactions"`);
    await queryRunner.query(`DROP TYPE "public"."stripe_transactions_status_enum"`);

    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "attempt_count"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "payment_method"`);
    await queryRunner.query(`DROP TYPE "public"."orders_payment_method_enum"`);

    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" RENAME VALUE 'CREATED' TO 'PENDING'`,
    );

    await queryRunner.query(`ALTER TABLE "orders" RENAME COLUMN "total_amount" TO "amount"`);
  }
}
