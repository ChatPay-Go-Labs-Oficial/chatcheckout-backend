import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIngestionJobsAndProductColumns1777900000000 implements MigrationInterface {
  name = 'AddIngestionJobsAndProductColumns1777900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ENUM type — IF NOT EXISTS via exception handling (PostgreSQL doesn't support IF NOT EXISTS for types)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."ingestion_jobs_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ingestion_jobs" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id"      uuid NOT NULL,
        "seller_id"       uuid NOT NULL,
        "r2_key"          character varying(512) NOT NULL,
        "original_name"   character varying(255) NOT NULL,
        "file_size_bytes" bigint NOT NULL,
        "status"          "public"."ingestion_jobs_status_enum" NOT NULL DEFAULT 'pending',
        "chunks_created"  integer,
        "error_message"   text,
        "started_at"      TIMESTAMP WITH TIME ZONE,
        "completed_at"    TIMESTAMP WITH TIME ZONE,
        "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ingestion_jobs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ingestion_jobs_product_id" ON "ingestion_jobs" ("product_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ingestion_jobs_status" ON "ingestion_jobs" ("status")
    `);

    // FK constraints — IF NOT EXISTS via exception handling
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "ingestion_jobs"
          ADD CONSTRAINT "FK_ingestion_jobs_product" FOREIGN KEY ("product_id")
            REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "ingestion_jobs"
          ADD CONSTRAINT "FK_ingestion_jobs_seller" FOREIGN KEY ("seller_id")
            REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // Product columns — IF NOT EXISTS supported since PostgreSQL 9.6
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "knowledge_ready" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "knowledge_updated_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "ebook_r2_key" character varying`);
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "crypto_payments_enabled" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "crypto_payments_enabled"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "ebook_r2_key"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "knowledge_updated_at"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "knowledge_ready"`);
    await queryRunner.query(`ALTER TABLE "ingestion_jobs" DROP CONSTRAINT IF EXISTS "FK_ingestion_jobs_seller"`);
    await queryRunner.query(`ALTER TABLE "ingestion_jobs" DROP CONSTRAINT IF EXISTS "FK_ingestion_jobs_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_ingestion_jobs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_ingestion_jobs_product_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ingestion_jobs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."ingestion_jobs_status_enum"`);
  }
}
