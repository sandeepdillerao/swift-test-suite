import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Project } from '@/modules/projects/entities/project.entity';
import { TestSuite } from '@/modules/test-suites/entities/test-suite.entity';
import { User } from '@/modules/users/entities/user.entity';
import { JiraSyncStatus, Priority, TestStatus, TestType } from './test-case.enums';

export interface TestStep {
  id: string;
  order: number;
  action: string;
  expectedResult: string;
}

@Entity('test_cases')
export class TestCase {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 20, unique: true }) tcId: string;
  @Column({ type: 'uuid' }) projectId: string;
  @Column({ type: 'uuid' }) suiteId: string;
  @Column({ type: 'uuid' }) createdBy: string;
  @Column({ type: 'uuid', nullable: true }) assignedTo: string | null;
  @Column({ type: 'varchar', length: 500 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'text', nullable: true }) preconditions: string | null;
  @Column({ type: 'jsonb', default: '[]' }) steps: TestStep[];
  @Column({ type: 'text' }) expectedResult: string;
  @Column({ type: 'enum', enum: Priority, default: Priority.MEDIUM }) priority: Priority;
  @Column({ type: 'enum', enum: TestType, default: TestType.MANUAL }) type: TestType;
  @Column({ type: 'enum', enum: TestStatus, default: TestStatus.NOT_RUN }) status: TestStatus;
  @Column({ type: 'text', array: true, default: '{}' }) tags: string[];
  @Column({ type: 'varchar', length: 100, nullable: true }) jiraTicketId: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) jiraTicketUrl: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) jiraSubtaskId: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) jiraSubtaskUrl: string | null;
  @Column({ type: 'enum', enum: JiraSyncStatus, nullable: true }) jiraSyncStatus: JiraSyncStatus | null;
  @Column({ type: 'timestamp', nullable: true }) lastRunAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @DeleteDateColumn() deletedAt: Date | null;

  @ManyToOne(() => Project) @JoinColumn({ name: 'projectId' }) project: Project;
  @ManyToOne(() => TestSuite) @JoinColumn({ name: 'suiteId' }) suite: TestSuite;
  @ManyToOne(() => User) @JoinColumn({ name: 'createdBy' }) creator: User;
  @ManyToOne(() => User, { nullable: true }) @JoinColumn({ name: 'assignedTo' }) assignee: User | null;
}
