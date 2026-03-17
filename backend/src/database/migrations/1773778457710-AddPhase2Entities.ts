import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhase2Entities1773778457710 implements MigrationInterface {
    name = 'AddPhase2Entities1773778457710'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "test_cases" RENAME COLUMN "tc_id" TO "tcId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "test_cases" RENAME COLUMN "tcId" TO "tc_id"`);
    }

}
