import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsTables1772200000000 implements MigrationInterface {
  name = 'CreateEventsTables1772200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "event" (
        "id" character varying(64) NOT NULL,
        "title" character varying(120) NOT NULL,
        "subtitle" text NOT NULL,
        "description" text NOT NULL,
        "dateLabel" character varying(64) NOT NULL,
        "location" character varying(120) NOT NULL,
        "audience" character varying(32) NOT NULL DEFAULT 'Public',
        "status" character varying(32) NOT NULL DEFAULT 'planned',
        "image" text NOT NULL,
        "agenda" jsonb NOT NULL DEFAULT '[]',
        "menuHighlights" jsonb NOT NULL DEFAULT '[]',
        "hostName" character varying(120) NOT NULL DEFAULT 'Serenity Team',
        "maxGuests" integer NOT NULL DEFAULT 100,
        "registrationOpenAt" TIMESTAMP,
        "registrationCloseAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "event_booking" (
        "id" character varying(64) NOT NULL,
        "eventId" character varying(64) NOT NULL,
        "userId" integer NOT NULL,
        "bookingNumber" character varying(64) NOT NULL,
        "status" character varying(24) NOT NULL DEFAULT 'confirmed',
        "name" character varying(120) NOT NULL,
        "email" character varying(120) NOT NULL,
        "phone" character varying(32) NOT NULL,
        "guestCount" integer NOT NULL DEFAULT 1,
        "note" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_booking_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_event_booking_event" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_event_status" ON "event" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_event_booking_eventId" ON "event_booking" ("eventId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_event_booking_userId" ON "event_booking" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_event_booking_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_event_booking_eventId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_event_status"`);
    await queryRunner.query(`DROP TABLE "event_booking"`);
    await queryRunner.query(`DROP TABLE "event"`);
  }
}
