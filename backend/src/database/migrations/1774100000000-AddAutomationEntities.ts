import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutomationEntities1774100000000 implements MigrationInterface {
  name = 'AddAutomationEntities1774100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop any stale objects left by synchronize or a failed prior attempt
    await queryRunner.query(`DROP TABLE IF EXISTS "script_executions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_scripts" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "script_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "execution_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "browser_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "script_source_enum"`);

    // Enums
    await queryRunner.query(`
      CREATE TYPE "script_status_enum" AS ENUM ('draft', 'ready', 'running', 'passed', 'failed', 'error')
    `);
    await queryRunner.query(`
      CREATE TYPE "execution_status_enum" AS ENUM ('queued', 'running', 'passed', 'failed', 'error', 'healed')
    `);
    await queryRunner.query(`
      CREATE TYPE "browser_type_enum" AS ENUM ('chromium', 'firefox', 'webkit')
    `);
    await queryRunner.query(`
      CREATE TYPE "script_source_enum" AS ENUM ('ai_generated', 'codegen', 'manual')
    `);

    // automation_scripts
    await queryRunner.query(`
      CREATE TABLE "automation_scripts" (
        "id"                  UUID DEFAULT uuid_generate_v4() NOT NULL,
        "testCaseId"          UUID NOT NULL,
        "projectId"           UUID NOT NULL,
        "name"                VARCHAR(500) NOT NULL,
        "rawScript"           TEXT,
        "cleanScript"         TEXT,
        "healedScript"        TEXT,
        "activeScript"        TEXT,
        "targetUrl"           VARCHAR(1000),
        "status"              "script_status_enum" NOT NULL DEFAULT 'draft',
        "source"              "script_source_enum" NOT NULL DEFAULT 'ai_generated',
        "browserType"         "browser_type_enum" NOT NULL DEFAULT 'chromium',
        "stabilityScore"      INT NOT NULL DEFAULT 0,
        "healingAttempts"     INT NOT NULL DEFAULT 0,
        "maxHealingAttempts"  INT NOT NULL DEFAULT 3,
        "totalRuns"           INT NOT NULL DEFAULT 0,
        "passedRuns"          INT NOT NULL DEFAULT 0,
        "lastRunAt"           TIMESTAMP,
        "lastRunDuration"     INT,
        "metadata"            JSONB NOT NULL DEFAULT '{}',
        "createdBy"           UUID NOT NULL,
        "createdAt"           TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt"           TIMESTAMP,
        CONSTRAINT "PK_automation_scripts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_automation_scripts_test_case" FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_automation_scripts_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    // script_executions
    await queryRunner.query(`
      CREATE TABLE "script_executions" (
        "id"              UUID DEFAULT uuid_generate_v4() NOT NULL,
        "scriptId"        UUID NOT NULL,
        "testCaseId"      UUID NOT NULL,
        "status"          "execution_status_enum" NOT NULL DEFAULT 'queued',
        "startedAt"       TIMESTAMP,
        "completedAt"     TIMESTAMP,
        "duration"        INT,
        "logs"            TEXT,
        "errorMessage"    TEXT,
        "screenshots"     JSONB NOT NULL DEFAULT '[]',
        "videoPath"       VARCHAR(1000),
        "healingApplied"  BOOLEAN NOT NULL DEFAULT false,
        "healingDetails"  JSONB,
        "browserType"     "browser_type_enum" NOT NULL DEFAULT 'chromium',
        "scriptSnapshot"  TEXT,
        "executedBy"      UUID NOT NULL,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_script_executions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_script_executions_script" FOREIGN KEY ("scriptId") REFERENCES "automation_scripts"("id") ON DELETE CASCADE
      )
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX "IDX_automation_scripts_testCaseId" ON "automation_scripts" ("testCaseId")`);
    await queryRunner.query(`CREATE INDEX "IDX_automation_scripts_projectId" ON "automation_scripts" ("projectId")`);
    await queryRunner.query(`CREATE INDEX "IDX_automation_scripts_status" ON "automation_scripts" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_script_executions_scriptId" ON "script_executions" ("scriptId")`);
    await queryRunner.query(`CREATE INDEX "IDX_script_executions_testCaseId" ON "script_executions" ("testCaseId")`);
    await queryRunner.query(`CREATE INDEX "IDX_script_executions_status" ON "script_executions" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "script_executions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_scripts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "script_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "browser_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "execution_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "script_status_enum"`);
  }
}
