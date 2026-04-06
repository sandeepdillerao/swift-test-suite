import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnvironmentsAndExecutionSupport1774300000000 implements MigrationInterface {
  name = 'AddEnvironmentsAndExecutionSupport1774300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Project Environments table ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "project_environments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "baseUrl" varchar(500) NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT false,
        "authConfigs" jsonb NOT NULL DEFAULT '[]',
        "variables" jsonb NOT NULL DEFAULT '{}',
        "createdBy" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "pk_project_environments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_pe_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    // ── TestRun: add environmentId ──────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "test_runs"
      ADD COLUMN "environmentId" uuid,
      ADD CONSTRAINT "fk_tr_environment" FOREIGN KEY ("environmentId") REFERENCES "project_environments"("id") ON DELETE SET NULL
    `);

    // ── TestRunCase: add execution mode + script linking ────────────────
    await queryRunner.query(`
      ALTER TABLE "test_run_cases"
      ADD COLUMN "executionMode" varchar(20) NOT NULL DEFAULT 'manual',
      ADD COLUMN "scriptId" uuid,
      ADD COLUMN "scriptExecutionId" uuid
    `);

    // ── TestRunStatus: add 'executing' value to the enum ────────────────
    await queryRunner.query(`
      ALTER TYPE "test_runs_status_enum" ADD VALUE IF NOT EXISTS 'executing'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "test_run_cases" DROP COLUMN IF EXISTS "scriptExecutionId"`);
    await queryRunner.query(`ALTER TABLE "test_run_cases" DROP COLUMN IF EXISTS "scriptId"`);
    await queryRunner.query(`ALTER TABLE "test_run_cases" DROP COLUMN IF EXISTS "executionMode"`);
    await queryRunner.query(`ALTER TABLE "test_runs" DROP CONSTRAINT IF EXISTS "fk_tr_environment"`);
    await queryRunner.query(`ALTER TABLE "test_runs" DROP COLUMN IF EXISTS "environmentId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_environments"`);
  }
}
