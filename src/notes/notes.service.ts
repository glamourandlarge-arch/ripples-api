import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './note.entity.js';
import { NOTE_SEEDS } from './notes.seed.js';

export type NoteResponse = {
  id: string;
  title: string;
  detail: string;
};

@Injectable()
export class NotesService implements OnModuleInit {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    @InjectRepository(Note) private readonly notes: Repository<Note>,
  ) {}

  async onModuleInit() {
    const count = await this.notes.count();
    if (count > 0) {
      return;
    }

    const createdAt = Date.now();
    await this.notes.save(
      NOTE_SEEDS.map((seed, index) =>
        this.notes.create({
          title: seed.title,
          detail: seed.detail,
          createdAt: new Date(createdAt + index),
        }),
      ),
    );
    this.logger.log(`Seeded ${NOTE_SEEDS.length} notes`);
  }

  async findAll(): Promise<NoteResponse[]> {
    const notes = await this.notes.find({
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return notes.map((note) => toNoteResponse(note));
  }
}

export function toNoteResponse(
  note: Pick<Note, 'id' | 'title' | 'detail'>,
): NoteResponse {
  return {
    id: note.id,
    title: note.title,
    detail: note.detail,
  };
}
