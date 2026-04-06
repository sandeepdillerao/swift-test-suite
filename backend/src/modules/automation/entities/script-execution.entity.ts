import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AutomationScript } from './automation-script.entity';
import { ExecutionStatus, BrowserType } from './automation.enums';

@Entity('script_executions')
export class ScriptExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  scriptId: string;

  @Column({ type: 'uuid' })
  testCaseId: string;

  @Column({ type: 'enum', enum: ExecutionStatus, enumName: 'execution_status_enum', default: ExecutionStatus.QUEUED })
  status: ExecutionStatus;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @Column({ type: 'text', nullable: true })
  logs: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', default: [] })
  screenshots: string[];

  @Column({ type: 'varchar', length: 1000, nullable: true })
  videoPath: string | null;

  @Column({ type: 'boolean', default: false })
  healingApplied: boolean;

  @Column({ type: 'jsonb', nullable: true })
  healingDetails: Record<string, any> | null;

  @Column({ type: 'enum', enum: BrowserType, enumName: 'browser_type_enum', default: BrowserType.CHROMIUM })
  browserType: BrowserType;

  @Column({ type: 'text', nullable: true })
  scriptSnapshot: string | null;

  @Column({ type: 'uuid' })
  executedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => AutomationScript, (script) => script.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scriptId' })
  script: AutomationScript;
}
