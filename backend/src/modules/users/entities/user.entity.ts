import { Organization } from '@/modules/organizations/entities/organization.entity';
import { Role } from '@/modules/rbac/entities/role.entity';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  QA_LEAD = 'qa_lead',
  TESTER = 'tester',
  VIEWER = 'viewer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', length: 500 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.TESTER })
  role: UserRole;

  /** New RBAC: FK to organization-scoped Role entity */
  @Column({ type: 'uuid', nullable: true })
  roleId: string | null;

  @ManyToOne(() => Role, { eager: false, nullable: true })
  @JoinColumn({ name: 'roleId' })
  roleEntity: Role | null;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  invitedBy: string | null;

  @Exclude()
  @Column({ type: 'varchar', length: 500, nullable: true })
  inviteToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  inviteExpiresAt: Date | null;

  @Exclude()
  @Column({ type: 'varchar', length: 500, nullable: true })
  passwordResetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpiresAt: Date | null;

  @Exclude()
  @Column({ type: 'varchar', length: 500, nullable: true })
  refreshTokenHash: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @ManyToOne(() => Organization, (org) => org.users)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  get displayName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
