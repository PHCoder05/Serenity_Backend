import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiOutletFoundation1773400000000 implements MigrationInterface {
  name = 'MultiOutletFoundation1773400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "outlet" (
        "id" character varying(64) NOT NULL,
        "slug" character varying(64) NOT NULL,
        "name" character varying(128) NOT NULL,
        "address" text,
        "petpoojaRestId" character varying(64),
        "isActive" boolean NOT NULL DEFAULT true,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_outlet_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_outlet_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_outlet_one_default"
      ON "outlet" ("isDefault")
      WHERE "isDefault" = true
    `);

    await queryRunner.query(`
      ALTER TABLE "store_status"
      ADD COLUMN IF NOT EXISTS "outletId" character varying(64)
    `);

    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ADD COLUMN IF NOT EXISTS "outletId" character varying(64)
    `);

    await queryRunner.query(`
      INSERT INTO "outlet" ("id", "slug", "name", "address", "petpoojaRestId", "isActive", "isDefault")
      VALUES (
        'outlet-serenity-1',
        'serenity-demo',
        'Serenity Demo',
        'Serenity Kitchen',
        NULL,
        true,
        true
      )
      ON CONFLICT ("id") DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "store_status"
      SET "outletId" = 'outlet-serenity-1'
      WHERE "id" = 1 AND ("outletId" IS NULL OR "outletId" = '')
    `);

    await queryRunner.query(`
      UPDATE "serenity_order"
      SET "outletId" = 'outlet-serenity-1'
      WHERE "outletId" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_store_status_outletId"
      ON "store_status" ("outletId")
      WHERE "outletId" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_serenity_order_outletId"
      ON "serenity_order" ("outletId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_serenity_order_outletId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_store_status_outletId"`,
    );
    await queryRunner.query(`
      ALTER TABLE "serenity_order" DROP COLUMN IF EXISTS "outletId"
    `);
    await queryRunner.query(`
      ALTER TABLE "store_status" DROP COLUMN IF EXISTS "outletId"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_outlet_one_default"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "outlet"`);
  }
}
