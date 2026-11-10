import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';

const trim: ValueTransformer = {
  to: (value: unknown) => (typeof value === 'string' ? value.trim() : value),
  from: (value: unknown) => value,
};

@Entity({ name: 'amenities' })
export class Amenity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'text', transformer: trim })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'text', transformer: trim })
  slug: string;

  @Column({ type: 'text', transformer: trim })
  icon: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  ensureId() {
    this.id ??= randomUUID();
  }
}
