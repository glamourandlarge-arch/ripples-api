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

export type RentalApplicationStatus =
  | 'submitted'
  | 'clarification-required'
  | 'approved'
  | 'declined'
  | 'withdrawn';

@Entity({ name: 'property_rental_applications' })
@Unique(['userId', 'propertyId'])
export class PropertyRentalApplication {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ name: 'property_id', type: 'text' })
  propertyId: string;

  @Column({ name: 'full_name', type: 'text' })
  fullName: string;

  @Column({ type: 'text' })
  phone: string;

  @Column({ name: 'employment_status', type: 'text' })
  employmentStatus: string;

  @Column({ name: 'move_in_date', type: 'date' })
  moveInDate: string;

  @Column({ type: 'int', default: 1 })
  occupants: number;

  @Column({ type: 'text', default: '' })
  message: string;

  @Column({ name: 'document_names', type: 'jsonb', default: [] })
  documentNames: string[];

  @Column({ type: 'text', default: 'submitted' })
  status: RentalApplicationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  ensureId() {
    this.id ??= randomUUID();
  }
}
