import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateAmenityDto } from '../amenities/create-amenity.dto.js';
import { UpdateAmenityDto } from '../amenities/update-amenity.dto.js';
import { AmenitiesService } from '../services/amenities.service.js';
import { Public } from '../utils/decorators/public.decorator.js';

@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenities: AmenitiesService) {}

  @Public()
  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const rows = await this.amenities.findAll(includeInactive === 'true');
    return { message: 'Amenities fetched successfully', data: rows };
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.amenities.findOne(id);
    return { message: 'Amenity fetched successfully', data: row };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  async create(@Body() input: CreateAmenityDto) {
    const row = await this.amenities.create(input);
    return { message: 'Amenity created successfully', data: row };
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateAmenityDto,
  ) {
    const row = await this.amenities.update(id, input);
    return { message: 'Amenity updated successfully', data: row };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.amenities.remove(id);
  }
}
