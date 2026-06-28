import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePetpoojaTables1760000000000 implements MigrationInterface {
  name = 'CreatePetpoojaTables1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "petpooja_restaurant" (
        "id" SERIAL NOT NULL,
        "restId" character varying NOT NULL,
        "name" character varying,
        "active" character varying,
        "storeStatus" character varying NOT NULL DEFAULT '1',
        "turnOnTime" character varying,
        "closedReason" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_petpooja_restaurant" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_petpooja_restaurant_restId"
      ON "petpooja_restaurant" ("restId")
    `);

    await queryRunner.query(`
      CREATE TABLE "petpooja_menu_snapshot" (
        "id" SERIAL NOT NULL,
        "restId" character varying NOT NULL,
        "payload" jsonb NOT NULL,
        "source" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_petpooja_menu_snapshot" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_petpooja_menu_snapshot_restId"
      ON "petpooja_menu_snapshot" ("restId")
    `);

    await queryRunner.query(`
      CREATE TABLE "petpooja_menu_item_stock" (
        "id" SERIAL NOT NULL,
        "restId" character varying NOT NULL,
        "itemId" character varying NOT NULL,
        "type" character varying NOT NULL,
        "inStock" boolean NOT NULL,
        "autoTurnOnTime" character varying,
        "customTurnOnTime" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_petpooja_menu_item_stock" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_petpooja_menu_item_stock_unique"
      ON "petpooja_menu_item_stock" ("restId", "itemId", "type")
    `);

    await queryRunner.query(`
      CREATE TABLE "petpooja_order" (
        "id" SERIAL NOT NULL,
        "restId" character varying NOT NULL,
        "orderId" character varying NOT NULL,
        "clientOrderId" character varying,
        "status" character varying NOT NULL,
        "orderInfo" jsonb,
        "cancelReason" character varying,
        "minimumPrepTime" integer,
        "riderName" character varying,
        "riderPhone" character varying,
        "isModified" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_petpooja_order" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_petpooja_order_unique"
      ON "petpooja_order" ("restId", "orderId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_petpooja_order_unique"`);
    await queryRunner.query(`DROP TABLE "petpooja_order"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_petpooja_menu_item_stock_unique"`,
    );
    await queryRunner.query(`DROP TABLE "petpooja_menu_item_stock"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_petpooja_menu_snapshot_restId"`,
    );
    await queryRunner.query(`DROP TABLE "petpooja_menu_snapshot"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_petpooja_restaurant_restId"`,
    );
    await queryRunner.query(`DROP TABLE "petpooja_restaurant"`);
  }
}
