import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { State } from './state.entity.js';

@Entity({ name: 'countries' })
export class Country {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Index({ unique: true })
  @Column({ name: 'source_id', type: 'int' })
  sourceId: number;

  @Column({ type: 'text' })
  name: string;

  @Index({ unique: true })
  @Column({ name: 'iso2', type: 'char', length: 2 })
  iso2: string;

  @Index({ unique: true })
  @Column({ name: 'iso3', type: 'char', length: 3 })
  iso3: string;

  @Column({ name: 'phone_code', type: 'text', nullable: true })
  phoneCode: string | null;

  @Column({ type: 'text', nullable: true })
  currency: string | null;

  @Column({ type: 'text', nullable: true })
  capital: string | null;

  @Column({ type: 'text', nullable: true })
  region: string | null;

  @Column({ type: 'text', nullable: true })
  subregion: string | null;

  @Column({ type: 'text', nullable: true })
  emoji: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @OneToMany(() => State, (state) => state.country)
  states: State[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  ensureId() {
    this.id ??= randomUUID();
  }
}
