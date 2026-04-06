import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Project } from '@/modules/projects/entities/project.entity';
import { ProjectEnvironment } from '@/modules/projects/entities/project-environment.entity';
import { Release } from '@/modules/releases/entities/release.entity';
import { User } from '@/modules/users/entities/user.entity';
import { TestRunCase } from './test-run-case.entity';
import { TestRunStatus } from './test-run.enums';

@Entity('test_runs')
export class TestRun {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) projectId: string;
  @Column({ type: 'uuid', nullable: true }) releaseId: string | null;
  @Column({ type: 'uuid', nullable: true }) environmentId: string | null;
  @Column({ type: 'uuid' }) createdBy: string;
  @Column({ type: 'uuid', nullable: true }) assignedTo: string | null;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'enum', enum: TestRunStatus, default: TestRunStatus.ACTIVE }) status: TestRunStatus;
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 }) passRate: number;
  @Column({ type: 'varchar', length: 100, nullable: true }) environment: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) buildNumber: string | null;
  @Column({ type: 'timestamp', nullable: true }) startedAt: Date | null;
  @Column({ type: 'timestamp', nullable: true }) completedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @DeleteDateColumn() deletedAt: Date | null;

  @ManyToOne(() => Project) @JoinColumn({ name: 'projectId' }) project: Project;
  @ManyToOne(() => ProjectEnvironment, { nullable: true }) @JoinColumn({ name: 'environmentId' }) environmentConfig: ProjectEnvironment | null;
  @ManyToOne(() => Release, { nullable: true }) @JoinColumn({ name: 'releaseId' }) release: Release | null;
  @ManyToOne(() => User) @JoinColumn({ name: 'createdBy' }) creator: User;
  @ManyToOne(() => User, { nullable: true }) @JoinColumn({ name: 'assignedTo' }) assignee: User | null;
  @OneToMany(() => TestRunCase, (trc) => trc.testRun) testCases: TestRunCase[];
}
