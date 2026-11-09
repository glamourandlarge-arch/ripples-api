import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type InspectionStage =
  | 'awaiting-confirmation'
  | 'counterproposed'
  | 'payment-required'
  | 'booked'
  | 'start-awaiting-partner'
  | 'in-progress'
  | 'end-awaiting-partner'
  | 'outcome-required'
  | 'completed'
  | 'disputed'
  | 'declined';

@Entity({ name: 'property_inspections' })
@Unique(['userId', 'propertyId'])
export class PropertyInspection {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ name: 'property_id', type: 'text' })
  propertyId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text' })
  time: string;

  @Column({ type: 'text', default: '' })
  notes: string;

  @Column({ type: 'text', default: 'awaiting-confirmation' })
  stage: InspectionStage;

  @Column({ name: 'is_protected', type: 'boolean', default: false })
  protected: boolean;

  @Column({ type: 'int', default: 0 })
  fee: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  ensureId() {
    this.id ??= randomUUID();
  }
}
