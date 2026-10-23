import { Controller, Get } from '@nestjs/common';
import { NotesService } from './notes.service.js';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  findAll() {
    return this.notesService.findAll();
  }
}
