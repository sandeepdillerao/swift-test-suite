import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TestCase } from '@/modules/test-cases/entities/test-case.entity';
import { Project } from '@/modules/projects/entities/project.entity';
import { ScriptStatus, BrowserType, ScriptSource } from './automation.enums';
import { ScriptExecution } from './script-execution.entity';

@Entity('automation_scripts')
export class AutomationScript {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  testCaseId: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'text', nullable: true })
  rawScript: string | null;

  @Column({ type: 'text', nullable: true })
  cleanScript: string | null;

  @Column({ type: 'text', nullable: true })
  healedScript: string | null;

  @Column({ type: 'text', nullable: true })
  activeScript: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  targetUrl: string | null;

  @Column({ type: 'enum', enum: ScriptStatus, enumName: 'script_status_enum', default: ScriptStatus.DRAFT })
  status: ScriptStatus;

  @Column({ type: 'enum', enum: ScriptSource, enumName: 'script_source_enum', default: ScriptSource.AI_GENERATED })
  source: ScriptSource;

  @Column({ type: 'enum', enum: BrowserType, enumName: 'browser_type_enum', default: BrowserType.CHROMIUM })
  browserType: BrowserType;

  @Column({ type: 'int', default: 0 })
  stabilityScore: number;

  @Column({ type: 'int', default: 0 })
  healingAttempts: number;

  @Column({ type: 'int', default: 3 })
  maxHealingAttempts: number;

  @Column({ type: 'int', default: 0 })
  totalRuns: number;

  @Column({ type: 'int', default: 0 })
  passedRuns: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @Column({ type: 'int', nullable: true })
  lastRunDuration: number | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'uuid' })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @ManyToOne(() => TestCase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'testCaseId' })
  testCase: TestCase;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @OneToMany(() => ScriptExecution, (exec) => exec.script)
  executions: ScriptExecution[];
}
