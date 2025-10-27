import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1761149095086 implements MigrationInterface {
  name = 'InitialSchema1761149095086';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_329b8ae12068b23da547d3b4798"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('infoproducer', 'client')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "cpf" character varying(11) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'client', "company_name" character varying(200), "cnpj" character varying(14), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_230b925048540454c8b4c481e1c" UNIQUE ("cpf"), CONSTRAINT "UQ_a7815967475d0accd76feba8a1e" UNIQUE ("cnpj"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_a7815967475d0accd76feba8a1" ON "users" ("cnpj") `);
    await queryRunner.query(`CREATE INDEX "IDX_230b925048540454c8b4c481e1" ON "users" ("cpf") `);
    await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_329b8ae12068b23da547d3b4798" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_329b8ae12068b23da547d3b4798"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_230b925048540454c8b4c481e1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a7815967475d0accd76feba8a1"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_329b8ae12068b23da547d3b4798" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
