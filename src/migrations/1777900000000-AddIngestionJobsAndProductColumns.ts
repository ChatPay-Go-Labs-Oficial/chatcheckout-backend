import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIngestionJobsAndProductColumns1777900000000 implements MigrationInterface {
  name = 'AddIngestionJobsAndProductColumns1777900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ingestion_jobs: tracks async PDF processing jobs (owned by backend)
    await queryRunner.query(`
      CREATE TYPE "public"."ingestion_jobs_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')
    `);
    await queryRunner.query(`
      CREATE TABLE "ingestion_jobs" (
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
      CREATE INDEX "idx_ingestion_jobs_product_id" ON "ingestion_jobs" ("product_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ingestion_jobs_status" ON "ingestion_jobs" ("status")
    `);
    await queryRunner.query(`
      ALTER TABLE "ingestion_jobs"
        ADD CONSTRAINT "FK_ingestion_jobs_product" FOREIGN KEY ("product_id")
          REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "ingestion_jobs"
        ADD CONSTRAINT "FK_ingestion_jobs_seller" FOREIGN KEY ("seller_id")
          REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // product columns: knowledge state tracked by backend for upload/status endpoints
    await queryRunner.query(`ALTER TABLE "product" ADD "knowledge_ready" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "product" ADD "knowledge_updated_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "product" ADD "ebook_r2_key" character varying`);
    await queryRunner.query(`ALTER TABLE "product" ADD "crypto_payments_enabled" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "crypto_payments_enabled"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "ebook_r2_key"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "knowledge_updated_at"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "knowledge_ready"`);
    await queryRunner.query(`ALTER TABLE "ingestion_jobs" DROP CONSTRAINT "FK_ingestion_jobs_seller"`);
    await queryRunner.query(`ALTER TABLE "ingestion_jobs" DROP CONSTRAINT "FK_ingestion_jobs_product"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ingestion_jobs_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ingestion_jobs_product_id"`);
    await queryRunner.query(`DROP TABLE "ingestion_jobs"`);
    await queryRunner.query(`DROP TYPE "public"."ingestion_jobs_status_enum"`);
  }
}
