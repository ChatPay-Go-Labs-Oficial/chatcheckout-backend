import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar tabela de auditoria e triggers
 * para rastrear operações de deleção na tabela orders
 */
export class AddAuditLog1773000000001 implements MigrationInterface {
  name = 'AddAuditLog1773000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tabela de auditoria
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "table_name" varchar(255) NOT NULL,
        "operation" varchar(50) NOT NULL,
        "old_data" jsonb,
        "new_data" jsonb,
        "user_name" varchar(255),
        "query_text" text,
        "executed_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "ip_address" inet
      )
    `);

    // 2. Criar índice para consultas eficientes
    await queryRunner.query(`
      CREATE INDEX "idx_audit_log_table" ON "audit_log"("table_name", "executed_at" DESC)
    `);

    // 3. Criar função para registrar deleções
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "log_order_deletion"()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO "audit_log" (
          "table_name",
          "operation",
          "old_data",
          "query_text",
          "executed_at"
        ) VALUES (
          'orders',
          'DELETE',
          row_to_json(OLD),
          current_query(),
          NOW()
        );
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql
    `);

    // 4. Criar trigger para DELETE
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trigger_order_delete_audit" ON "orders"
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trigger_order_delete_audit"
        BEFORE DELETE ON "orders"
        FOR EACH ROW
        EXECUTE FUNCTION "log_order_deletion"()
    `);

    // 5. Criar função para registrar TRUNCATE
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "log_order_truncate"()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO "audit_log" (
          "table_name",
          "operation",
          "query_text",
          "executed_at"
        ) VALUES (
          'orders',
          'TRUNCATE',
          current_query(),
          NOW()
        );
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    // 6. Criar trigger para TRUNCATE
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trigger_order_truncate_audit" ON "orders"
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trigger_order_truncate_audit"
        BEFORE TRUNCATE ON "orders"
        FOR EACH STATEMENT
        EXECUTE FUNCTION "log_order_truncate"()
    `);

    // 7. Criar trigger para INSERT (opcional - para rastrear criações)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "log_order_insert"()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO "audit_log" (
          "table_name",
          "operation",
          "new_data",
          "query_text",
          "executed_at"
        ) VALUES (
          'orders',
          'INSERT',
          row_to_json(NEW),
          current_query(),
          NOW()
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trigger_order_insert_audit" ON "orders"
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trigger_order_insert_audit"
        AFTER INSERT ON "orders"
        FOR EACH ROW
        EXECUTE FUNCTION "log_order_insert"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover triggers na ordem reversa
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trigger_order_insert_audit" ON "orders"
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trigger_order_truncate_audit" ON "orders"
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trigger_order_delete_audit" ON "orders"
    `);

    // Remover funções
    await queryRunner.query(`DROP FUNCTION IF EXISTS "log_order_insert"()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "log_order_truncate"()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "log_order_deletion"()`);

    // Remover índice
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_log_table"`);

    // Remover tabela
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_log"`);
  }
}
