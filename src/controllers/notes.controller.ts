import { Controller, Get } from '@nestjs/common';
import { NotesService } from '../services/notes.service.js';

@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  findAll() {
    return this.notes.findAll();
  }
}
