import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSerenityAppTables1771000000000 implements MigrationInterface {
  name = 'CreateSerenityAppTables1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "menu_item" (
        "id" character varying(120) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "shortLabel" character varying(255) NOT NULL,
        "image" text NOT NULL,
        "category" character varying(64) NOT NULL,
        "basePrice" integer NOT NULL,
        "moods" jsonb NOT NULL DEFAULT '[]',
        "variants" jsonb,
        "extras" jsonb,
        "isCustomizable" boolean NOT NULL DEFAULT true,
        "inStock" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_menu_item" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "diet_preference" (
        "id" character varying(64) NOT NULL,
        "label" character varying(255) NOT NULL,
        "description" text NOT NULL,
        CONSTRAINT "PK_diet_preference" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_profile" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "phone" character varying(32),
        "defaultAddress" text,
        "dietPreferenceIds" jsonb NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_profile_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_user_profile" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_profile_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "store_status" (
        "id" integer NOT NULL DEFAULT 1,
        "isOpen" boolean NOT NULL DEFAULT true,
        "message" character varying(255),
        "nextOpenAt" TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_status" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "serenity_order" (
        "id" character varying(64) NOT NULL,
        "userId" integer NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'confirmed',
        "orderedAt" TIMESTAMP NOT NULL,
        "itemSummary" character varying(255) NOT NULL,
        "note" text NOT NULL DEFAULT '',
        "total" integer NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "subtotal" integer NOT NULL,
        "couponDiscount" integer NOT NULL DEFAULT 0,
        "gst" integer NOT NULL DEFAULT 0,
        "amountPaid" integer NOT NULL,
        "paidVia" character varying(32) NOT NULL DEFAULT 'UPI',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_serenity_order" PRIMARY KEY ("id"),
        CONSTRAINT "FK_serenity_order_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_serenity_order_userId" ON "serenity_order" ("userId")
    `);

    await queryRunner.query(`
      CREATE TABLE "order_line_item" (
        "id" SERIAL NOT NULL,
        "orderId" character varying(64) NOT NULL,
        "title" character varying(255) NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "linePrice" integer NOT NULL DEFAULT 0,
        "ingredients" jsonb NOT NULL DEFAULT '[]',
        CONSTRAINT "PK_order_line_item" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_line_item_order" FOREIGN KEY ("orderId") REFERENCES "serenity_order"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "saved_bowl" (
        "id" character varying(120) NOT NULL,
        "userId" integer NOT NULL,
        "title" character varying(255) NOT NULL,
        "note" character varying(255) NOT NULL DEFAULT '',
        "description" text NOT NULL,
        "price" integer NOT NULL,
        "image" text NOT NULL,
        "ingredients" jsonb NOT NULL DEFAULT '[]',
        "addons" jsonb NOT NULL DEFAULT '[]',
        "savedNote" text NOT NULL DEFAULT '',
        "subtitle" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_bowl" PRIMARY KEY ("id"),
        CONSTRAINT "FK_saved_bowl_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_saved_bowl_userId" ON "saved_bowl" ("userId")
    `);

    await queryRunner.query(`
      CREATE TABLE "loyalty_transaction" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "label" character varying(255) NOT NULL,
        "points" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loyalty_transaction" PRIMARY KEY ("id"),
        CONSTRAINT "FK_loyalty_transaction_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_loyalty_transaction_userId" ON "loyalty_transaction" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "loyalty_transaction"`);
    await queryRunner.query(`DROP TABLE "saved_bowl"`);
    await queryRunner.query(`DROP TABLE "order_line_item"`);
    await queryRunner.query(`DROP TABLE "serenity_order"`);
    await queryRunner.query(`DROP TABLE "store_status"`);
    await queryRunner.query(`DROP TABLE "user_profile"`);
    await queryRunner.query(`DROP TABLE "diet_preference"`);
    await queryRunner.query(`DROP TABLE "menu_item"`);
  }
}
