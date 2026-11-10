import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AmenitiesController } from '../controllers/amenities.controller.js';
import { AmenitiesService } from '../services/amenities.service.js';
import { Amenity } from './amenity.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Amenity])],
  controllers: [AmenitiesController],
  providers: [AmenitiesService],
  exports: [AmenitiesService],
})
export class AmenitiesModule {}
