import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Organization } from '@/modules/organizations/entities/organization.entity';
import { User } from '@/modules/users/entities/user.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @Column({ type: 'uuid' }) createdBy: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 10 }) key: string; // e.g. 'SHOP', unique per org enforced in service
  @Column({ type: 'boolean', default: false }) isArchived: boolean;
  @Column({ type: 'jsonb', default: '{}' }) settings: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @DeleteDateColumn() deletedAt: Date | null;

  @ManyToOne(() => Organization) @JoinColumn({ name: 'organizationId' }) organization: Organization;
  @ManyToOne(() => User) @JoinColumn({ name: 'createdBy' }) creator: User;
}
