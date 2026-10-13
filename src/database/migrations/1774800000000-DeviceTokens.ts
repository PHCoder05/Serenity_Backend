import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeviceTokens1774800000000 implements MigrationInterface {
  name = 'DeviceTokens1774800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_token" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "token" character varying(4096) NOT NULL,
        "platform" character varying(16) NOT NULL DEFAULT 'android',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_device_token_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_device_token_token" UNIQUE ("token")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_device_token_userId" ON "device_token" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "device_token"`);
  }
}
