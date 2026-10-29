import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  PrimaryColumn,
  type ValueTransformer,
} from 'typeorm';

const trim: ValueTransformer = {
  to: (value: unknown) => (typeof value === 'string' ? value.trim() : value),
  from: (value: unknown) => value,
};

@Entity({ name: 'notes' })
export class Note {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'text', transformer: trim })
  title: string;

  @Column({ type: 'text', transformer: trim })
  detail: string;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @BeforeInsert()
  ensureId() {
    this.id ??= randomUUID();
  }
}
