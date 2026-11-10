import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { RegionsService } from '../services/regions.service.js';
import { Public } from '../utils/decorators/public.decorator.js';

@Public()
@Controller()
export class RegionsController {
  constructor(private readonly regions: RegionsService) {}

  @Get('countries')
  async listCountries(@Query('q') query?: string) {
    const rows = await this.regions.listCountries(query);
    return { message: 'Countries fetched successfully', data: rows };
  }

  @Get('countries/:countryId')
  async getCountry(@Param('countryId', ParseUUIDPipe) countryId: string) {
    const row = await this.regions.getCountry(countryId);
    return { message: 'Country fetched successfully', data: row };
  }

  @Get('countries/:countryId/states')
  async listStates(@Param('countryId', ParseUUIDPipe) countryId: string) {
    const rows = await this.regions.listStatesByCountry(countryId);
    return { message: 'States fetched successfully', data: rows };
  }

  @Get('states/:stateId')
  async getState(@Param('stateId', ParseUUIDPipe) stateId: string) {
    const row = await this.regions.getState(stateId);
    return { message: 'State fetched successfully', data: row };
  }

  @Get('states/:stateId/cities')
  async listCities(@Param('stateId', ParseUUIDPipe) stateId: string) {
    const rows = await this.regions.listCitiesByState(stateId);
    return { message: 'Cities fetched successfully', data: rows };
  }
}
