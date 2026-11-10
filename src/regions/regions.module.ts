import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegionsController } from '../controllers/regions.controller.js';
import { RegionsService } from '../services/regions.service.js';
import { City } from './city.entity.js';
import { Country } from './country.entity.js';
import { RegionsSeedService } from './regions-seed.service.js';
import { State } from './state.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Country, State, City])],
  controllers: [RegionsController],
  providers: [RegionsService, RegionsSeedService],
  exports: [RegionsService, RegionsSeedService],
})
export class RegionsModule {}
