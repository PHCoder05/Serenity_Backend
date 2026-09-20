import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderFeedbackFields1772300000000 implements MigrationInterface {
  name = 'AddOrderFeedbackFields1772300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      ADD COLUMN "foodRating" integer,
      ADD COLUMN "serviceRating" integer,
      ADD COLUMN "feedbackNote" text,
      ADD COLUMN "feedbackAt" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "serenity_order"
      DROP COLUMN "feedbackAt",
      DROP COLUMN "feedbackNote",
      DROP COLUMN "serviceRating",
      DROP COLUMN "foodRating"
    `);
  }
}
