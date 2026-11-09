import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { NotesService } from '../services/notes.service.js';

@ApiBearerAuth('access-token')
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  async findAll() {
    const rows = await this.notes.findAll();
    return { message: 'Notes fetched successfully', data: rows };
  }
}
