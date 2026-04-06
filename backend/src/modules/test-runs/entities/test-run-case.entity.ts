import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { TestStatus } from '@/modules/test-cases/entities/test-case.enums';
import { TestRun } from './test-run.entity';
import { ExecutionMode } from './test-run.enums';

@Entity('test_run_cases')
export class TestRunCase {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) testRunId: string;
  @Column({ type: 'uuid' }) testCaseId: string;
  @Column({ type: 'uuid', nullable: true }) executedBy: string | null;
  @Column({ type: 'enum', enum: TestStatus, default: TestStatus.NOT_RUN }) status: TestStatus;
  @Column({ type: 'timestamp', nullable: true }) executedAt: Date | null;
  @Column({ type: 'int', nullable: true }) duration: number | null;
  @Column({ type: 'text', nullable: true }) comment: string | null;
  @Column({ type: 'text', array: true, default: '{}' }) defects: string[];
  @Column({ type: 'text', nullable: true }) actualResult: string | null;

  /** Whether this case should be auto-executed or manually tested */
  @Column({ type: 'varchar', length: 20, default: ExecutionMode.MANUAL }) executionMode: ExecutionMode;

  /** The automation script to use for automated execution (null = manual) */
  @Column({ type: 'uuid', nullable: true }) scriptId: string | null;

  /** Links to the ScriptExecution result after automation runs */
  @Column({ type: 'uuid', nullable: true }) scriptExecutionId: string | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;

  @ManyToOne(() => TestRun, (run) => run.testCases) @JoinColumn({ name: 'testRunId' }) testRun: TestRun;
  @ManyToOne(() => TestCase) @JoinColumn({ name: 'testCaseId' }) testCase: TestCase;
}
