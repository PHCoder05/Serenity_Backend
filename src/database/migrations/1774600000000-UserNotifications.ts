import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserNotifications1774600000000 implements MigrationInterface {
  name = 'UserNotifications1774600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_notification" (
        "id" character varying(64) PRIMARY KEY,
        "userId" integer NOT NULL,
        "type" character varying(64) NOT NULL,
        "title" character varying(160) NOT NULL,
        "body" text NOT NULL,
        "meta" jsonb,
        "readAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_notification_userId"
      ON "user_notification" ("userId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_notification_userId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_notification"`);
  }
}
