import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

export interface AuthConfig {
  label: string;      // e.g. "Admin User", "Test User", "Invalid Creds"
  username: string;
  password: string;   // Encrypted at rest
  role?: string;      // e.g. "admin", "tester", "viewer"
}

@Entity('project_environments')
export class ProjectEnvironment {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) projectId: string;

  @Column({ type: 'varchar', length: 100 }) name: string;

  @Column({ type: 'varchar', length: 500 }) baseUrl: string;

  @Column({ type: 'boolean', default: false }) isDefault: boolean;

  /** Multiple auth configurations (e.g. success, failure, different roles) */
  @Column({ type: 'jsonb', default: '[]' }) authConfigs: AuthConfig[];

  /** Custom key-value variables for this environment */
  @Column({ type: 'jsonb', default: '{}' }) variables: Record<string, string>;

  @Column({ type: 'uuid' }) createdBy: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @DeleteDateColumn() deletedAt: Date | null;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
