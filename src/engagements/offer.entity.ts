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

export type OfferStatus =
  | 'new'
  | 'under-negotiation'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'expired';

@Entity({ name: 'property_offers' })
@Unique(['userId', 'propertyId'])
export class PropertyOffer {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ name: 'property_id', type: 'text' })
  propertyId: string;

  @Column({ name: 'asking_price', type: 'int' })
  askingPrice: number;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'text', default: '' })
  conditions: string;

  @Column({ type: 'text', default: '' })
  message: string;

  @Column({ type: 'text', default: 'new' })
  status: OfferStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  ensureId() {
    this.id ??= randomUUID();
  }
}
