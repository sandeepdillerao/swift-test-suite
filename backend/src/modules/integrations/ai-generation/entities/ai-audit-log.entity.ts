import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_audit_logs')
export class AiAuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'uuid' }) orgId: string;

  @Column({ type: 'varchar', length: 30 }) provider: string;
  @Column({ type: 'varchar', length: 100 }) model: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) jiraIssueKey: string | null;

  @Column({ type: 'int', default: 0 }) inputTokens: number;
  @Column({ type: 'int', default: 0 }) outputTokens: number;
  @Column({ type: 'int', default: 0 }) responseTimeMs: number;
  @Column({ type: 'int', default: 0 }) testCasesGenerated: number;

  @Column({ type: 'boolean', default: true }) success: boolean;
  @Column({ type: 'text', nullable: true }) errorMessage: string | null;

  @CreateDateColumn() createdAt: Date;
}
