import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Project } from '@/modules/projects/entities/project.entity';
import { User } from '@/modules/users/entities/user.entity';
import { ReleaseStatus } from './release.enums';

@Entity('releases')
export class Release {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) projectId: string;
  @Column({ type: 'uuid' }) createdBy: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 50 }) version: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'enum', enum: ReleaseStatus, default: ReleaseStatus.PLANNING }) status: ReleaseStatus;
  @Column({ type: 'timestamp', nullable: true }) plannedDate: Date | null;
  @Column({ type: 'timestamp', nullable: true }) releasedDate: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @DeleteDateColumn() deletedAt: Date | null;

  @ManyToOne(() => Project) @JoinColumn({ name: 'projectId' }) project: Project;
  @ManyToOne(() => User) @JoinColumn({ name: 'createdBy' }) creator: User;
}
