import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { NotesService } from '../services/notes.service.js';

@ApiBearerAuth('access-token')
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  findAll() {
    return this.notes.findAll();
  }
}
