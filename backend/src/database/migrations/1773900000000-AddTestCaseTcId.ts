import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTestCaseTcId1773900000000 implements MigrationInterface {
  name = 'AddTestCaseTcId1773900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sequence for generating TC IDs
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS tc_id_seq START WITH 1 INCREMENT BY 1`);

    // Add tc_id column (nullable initially so existing rows don't fail)
    await queryRunner.query(`ALTER TABLE "test_cases" ADD COLUMN "tc_id" VARCHAR(20)`);

    // Backfill existing rows using the sequence
    await queryRunner.query(`
      UPDATE "test_cases"
      SET "tc_id" = 'TC-' || LPAD(nextval('tc_id_seq')::text, 3, '0')
      WHERE "tc_id" IS NULL
    `);

    // Make column NOT NULL and UNIQUE
    await queryRunner.query(`ALTER TABLE "test_cases" ALTER COLUMN "tc_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "test_cases" ADD CONSTRAINT "UQ_test_cases_tc_id" UNIQUE ("tc_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "test_cases" DROP CONSTRAINT IF EXISTS "UQ_test_cases_tc_id"`);
    await queryRunner.query(`ALTER TABLE "test_cases" DROP COLUMN "tc_id"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS tc_id_seq`);
  }
}
