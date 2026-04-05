import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Generic AI audit log — tracks every AI provider call across the platform.
 *
 * `feature` + `action` identify *what* triggered the call.
 * `metadata` stores feature-specific context (JSONB) so the table
 * never needs schema changes for new use-cases.
 */
@Entity('ai_audit_logs')
@Index('idx_ai_audit_user', ['userId'])
@Index('idx_ai_audit_org', ['orgId'])
@Index('idx_ai_audit_feature', ['feature'])
export class AiAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  orgId: string;

  // ─── What triggered the call ────────────────────────────────────────────
  /** High-level feature area: 'test_generation', 'automation', etc. */
  @Column({ type: 'varchar', length: 50, default: 'test_generation' })
  feature: string;

  /** Specific action: 'generate_from_jira', 'generate_script', 'heal_script', 'enhance_codegen' */
  @Column({ type: 'varchar', length: 100, default: 'generate_from_jira' })
  action: string;

  // ─── Provider details ──────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 30 })
  provider: string;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  // ─── Usage metrics ─────────────────────────────────────────────────────
  @Column({ type: 'int', default: 0 })
  inputTokens: number;

  @Column({ type: 'int', default: 0 })
  outputTokens: number;

  @Column({ type: 'int', default: 0 })
  totalTokens: number;

  @Column({ type: 'int', default: 0 })
  responseTimeMs: number;

  // ─── Result ────────────────────────────────────────────────────────────
  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  // ─── Feature-specific context (flexible) ───────────────────────────────
  /** JSON blob — each feature puts its own context here.
   *  Examples:
   *    test_generation → { jiraIssueKey, testCasesGenerated }
   *    automation      → { testCaseId, scriptId, healingAttempt }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
