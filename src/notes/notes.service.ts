import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, type NoteDocument } from './note.schema.js';
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
    @InjectModel(Note.name) private readonly notes: Model<NoteDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.notes.countDocuments();
    if (count > 0) {
      return;
    }

    await this.notes.insertMany(NOTE_SEEDS);
    this.logger.log(`Seeded ${NOTE_SEEDS.length} notes`);
  }

  async findAll(): Promise<NoteResponse[]> {
    const notes = await this.notes.find().sort({ _id: 1 }).exec();
    return notes.map((note) => toNoteResponse(note));
  }
}

export function toNoteResponse(note: NoteDocument): NoteResponse {
  return {
    id: note._id.toString(),
    title: note.title,
    detail: note.detail,
  };
}
