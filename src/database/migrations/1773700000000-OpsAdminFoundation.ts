import { MigrationInterface, QueryRunner } from 'typeorm';

export class OpsAdminFoundation1773700000000 implements MigrationInterface {
  name = 'OpsAdminFoundation1773700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loyalty_settings" (
        "id" integer NOT NULL DEFAULT 1,
        "pointValueInr" integer NOT NULL DEFAULT 1,
        "maxRedeemPercent" double precision NOT NULL DEFAULT 0.2,
        "earnRate" double precision NOT NULL DEFAULT 0.2,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loyalty_settings" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_loyalty_settings_singleton" CHECK ("id" = 1)
      )
    `);

    await queryRunner.query(`
      INSERT INTO "loyalty_settings" ("id", "pointValueInr", "maxRedeemPercent", "earnRate")
      VALUES (1, 1, 0.2, 0.2)
      ON CONFLICT ("id") DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "home_mood" (
        "id" character varying(64) NOT NULL,
        "label" character varying(64) NOT NULL,
        "body" text NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_home_mood" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "home_mood" ("id", "label", "body", "sortOrder", "isActive")
      VALUES
        ('refresh', 'Refresh', 'Brighter ingredients and cooler textures to reset the pace.', 1, true),
        ('refuel', 'Refuel', 'Warm grains, steady energy, and a little more substance for the afternoon.', 2, true),
        ('relax', 'Relax', 'Soft textures and gentler flavors built for a slower, quieter kind of meal.', 3, true),
        ('focus', 'Focus', 'Clean bowls and lighter sips that stay crisp without feeling sharp or rushed.', 4, true)
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "home_mood"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loyalty_settings"`);
  }
}
