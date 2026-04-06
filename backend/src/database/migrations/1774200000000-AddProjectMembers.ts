import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from 'typeorm';

export class AddProjectMembers1774200000000 implements MigrationInterface {
  name = 'AddProjectMembers1774200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'project_members',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'projectId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'roleId', type: 'uuid', isNullable: true },
          { name: 'addedBy', type: 'uuid', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createUniqueConstraint(
      'project_members',
      new TableUnique({ name: 'uq_project_user', columnNames: ['projectId', 'userId'] }),
    );

    await queryRunner.createForeignKey(
      'project_members',
      new TableForeignKey({
        name: 'fk_pm_project',
        columnNames: ['projectId'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'project_members',
      new TableForeignKey({
        name: 'fk_pm_user',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // roleId FK is intentionally omitted — it's nullable (null = inherit org role)
    // and the roles table may not have been seeded yet at migration time
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('project_members', true, true, true);
  }
}
