import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TestStatus } from '@/modules/test-cases/entities/test-case.enums';
import { TestRun } from './test-run.entity';

@Entity('test_run_history')
export class TestRunHistory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) testRunId: string;
  @Column({ type: 'uuid' }) testCaseId: string;
  @Column({ type: 'uuid', nullable: true }) executedBy: string | null;
  @Column({ type: 'enum', enum: TestStatus }) status: TestStatus;
  @Column({ type: 'timestamp', nullable: true }) executedAt: Date | null;
  @Column({ type: 'int', nullable: true }) duration: number | null;
  @Column({ type: 'text', nullable: true }) comment: string | null;
  @CreateDateColumn() createdAt: Date;

  @ManyToOne(() => TestRun) @JoinColumn({ name: 'testRunId' }) testRun: TestRun;
}
