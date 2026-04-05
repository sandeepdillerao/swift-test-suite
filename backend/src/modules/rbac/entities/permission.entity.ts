import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** resource:action — e.g. 'test_cases:create', 'projects:delete' */
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  /** Grouping category — e.g. 'projects', 'test_cases', 'automation' */
  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
