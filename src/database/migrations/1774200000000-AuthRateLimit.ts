import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthRateLimit1774200000000 implements MigrationInterface {
  name = 'AuthRateLimit1774200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_rate_limit" (
        "id" SERIAL NOT NULL,
        "key" character varying(160) NOT NULL,
        "hitAt" TIMESTAMP NOT NULL,
        CONSTRAINT "PK_auth_rate_limit" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_rate_limit_key_hitAt"
      ON "auth_rate_limit" ("key", "hitAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_auth_rate_limit_key_hitAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_rate_limit"`);
  }
}
