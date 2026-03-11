import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckoutTracking1772546905990 implements MigrationInterface {
  name = 'AddCheckoutTracking1772546905990';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."checkout_tracking_sessions_end_reason_enum" AS ENUM('SUCCESS', 'FAILED', 'ABANDONED', 'EXPIRED')`,
    );

    await queryRunner.query(
      `CREATE TABLE "checkout_tracking_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "seller_id" uuid NOT NULL,
        "product_hash" character varying NOT NULL,
        "tracking_token_hash" character varying(64) NOT NULL,
        "started_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_seen_at" TIMESTAMP NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP NOT NULL,
        "ended_at" TIMESTAMP,
        "end_reason" "public"."checkout_tracking_sessions_end_reason_enum",
        "ip_hash" character varying(64),
        "user_agent_hash" character varying(64),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_checkout_tracking_sessions_tracking_token_hash" UNIQUE ("tracking_token_hash"),
        CONSTRAINT "PK_checkout_tracking_sessions_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."checkout_tracking_events_event_type_enum" AS ENUM(
        'CHECKOUT_SESSION_STARTED',
        'CHECKOUT_QA_STARTED',
        'CHECKOUT_STARTED',
        'CUSTOMER_DATA_SUBMITTED',
        'PAYMENT_METHOD_SELECTED',
        'WALLET_CONNECTED',
        'CRYPTO_ASSET_SELECTED',
        'PAYMENT_CONFIRM_CLICKED',
        'PAYMENT_INTENT_CREATED',
        'PIX_PRESENTED',
        'CARD_FORM_PRESENTED',
        'CARD_PAYMENT_CONFIRMED',
        'CRYPTO_ESCROW_CREATED',
        'CRYPTO_TX_SIGNED',
        'CRYPTO_TX_SUBMITTED',
        'CRYPTO_TX_CONFIRMED',
        'PAYMENT_FAILED',
        'PAYMENT_SUCCEEDED',
        'CHECKOUT_ABANDONED'
      )`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."checkout_tracking_events_step_enum" AS ENUM(
        'WELCOME',
        'QA',
        'CHECKOUT_STARTED',
        'CUSTOMER_DATA',
        'PAYMENT_METHOD',
        'WALLET_CONNECTION',
        'PAYMENT_REVIEW',
        'PAYMENT',
        'CONFIRMATION'
      )`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."checkout_tracking_events_payment_method_enum" AS ENUM('PIX', 'CARD', 'CRYPTO')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."checkout_tracking_events_source_enum" AS ENUM('FRONTEND', 'BACKEND')`,
    );

    await queryRunner.query(
      `CREATE TABLE "checkout_tracking_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "session_id" uuid NOT NULL,
        "seller_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "order_id" uuid,
        "event_type" "public"."checkout_tracking_events_event_type_enum" NOT NULL,
        "step" "public"."checkout_tracking_events_step_enum",
        "payment_method" "public"."checkout_tracking_events_payment_method_enum",
        "status" character varying(50),
        "source" "public"."checkout_tracking_events_source_enum" NOT NULL DEFAULT 'FRONTEND',
        "occurred_at" TIMESTAMP NOT NULL,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_checkout_tracking_events_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_sessions" ADD CONSTRAINT "FK_checkout_tracking_sessions_product" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_sessions" ADD CONSTRAINT "FK_checkout_tracking_sessions_seller" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_events" ADD CONSTRAINT "FK_checkout_tracking_events_session" FOREIGN KEY ("session_id") REFERENCES "checkout_tracking_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_events" ADD CONSTRAINT "FK_checkout_tracking_events_seller" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_events" ADD CONSTRAINT "FK_checkout_tracking_events_product" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_events" ADD CONSTRAINT "FK_checkout_tracking_events_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_checkout_tracking_events_session_occurred_at" ON "checkout_tracking_events" ("session_id", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_checkout_tracking_events_seller_occurred_at" ON "checkout_tracking_events" ("seller_id", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_checkout_tracking_events_product_occurred_at" ON "checkout_tracking_events" ("product_id", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_checkout_tracking_events_event_type_occurred_at" ON "checkout_tracking_events" ("event_type", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_checkout_tracking_events_order_id" ON "checkout_tracking_events" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_checkout_tracking_events_source" ON "checkout_tracking_events" ("source")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_checkout_tracking_sessions_seller_started_at" ON "checkout_tracking_sessions" ("seller_id", "started_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_checkout_tracking_sessions_expires_at" ON "checkout_tracking_sessions" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_checkout_tracking_sessions_expires_at"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_checkout_tracking_sessions_seller_started_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_checkout_tracking_events_source"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_checkout_tracking_events_order_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_checkout_tracking_events_event_type_occurred_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_checkout_tracking_events_product_occurred_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_checkout_tracking_events_seller_occurred_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_checkout_tracking_events_session_occurred_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_events" DROP CONSTRAINT "FK_checkout_tracking_events_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_events" DROP CONSTRAINT "FK_checkout_tracking_events_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_events" DROP CONSTRAINT "FK_checkout_tracking_events_seller"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_events" DROP CONSTRAINT "FK_checkout_tracking_events_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_sessions" DROP CONSTRAINT "FK_checkout_tracking_sessions_seller"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkout_tracking_sessions" DROP CONSTRAINT "FK_checkout_tracking_sessions_product"`,
    );

    await queryRunner.query(`DROP TABLE "checkout_tracking_events"`);
    await queryRunner.query(`DROP TYPE "public"."checkout_tracking_events_source_enum"`);
    await queryRunner.query(`DROP TYPE "public"."checkout_tracking_events_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "public"."checkout_tracking_events_step_enum"`);
    await queryRunner.query(`DROP TYPE "public"."checkout_tracking_events_event_type_enum"`);

    await queryRunner.query(`DROP TABLE "checkout_tracking_sessions"`);
    await queryRunner.query(`DROP TYPE "public"."checkout_tracking_sessions_end_reason_enum"`);
  }
}
