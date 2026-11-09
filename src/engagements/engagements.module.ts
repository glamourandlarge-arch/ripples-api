import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EngagementsController } from '../controllers/engagements.controller.js';
import { EngagementsService } from '../services/engagements.service.js';
import { PropertyInquiry } from './inquiry.entity.js';
import { PropertyInspection } from './inspection.entity.js';
import { PropertyOffer } from './offer.entity.js';
import { PropertyRentalApplication } from './rental-application.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PropertyInquiry,
      PropertyInspection,
      PropertyOffer,
      PropertyRentalApplication,
    ]),
  ],
  controllers: [EngagementsController],
  providers: [EngagementsService],
  exports: [EngagementsService],
})
export class EngagementsModule {}
