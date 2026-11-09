import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CreateInquiryDto } from '../engagements/create-inquiry.dto.js';
import { CreateInspectionDto } from '../engagements/create-inspection.dto.js';
import { CreateOfferDto } from '../engagements/create-offer.dto.js';
import { CreateRentalApplicationDto } from '../engagements/create-rental-application.dto.js';
import { EngagementsService } from '../services/engagements.service.js';
import type { UserResponse } from '../services/users.service.js';

@ApiBearerAuth('access-token')
@Controller('me')
export class EngagementsController {
  constructor(private readonly engagements: EngagementsService) {}

  @Get('engagements')
  async summary(@CurrentUser() user: UserResponse) {
    const data = await this.engagements.summary(user.id);
    return { message: 'Engagements fetched successfully', data };
  }

  @Post('inquiries')
  @HttpCode(HttpStatus.CREATED)
  async createInquiry(
    @CurrentUser() user: UserResponse,
    @Body() input: CreateInquiryDto,
  ) {
    const data = await this.engagements.createInquiry(user.id, input);
    return { message: 'Inquiry sent successfully', data };
  }

  @Get('inquiries')
  async listInquiries(@CurrentUser() user: UserResponse) {
    const data = await this.engagements.listInquiries(user.id);
    return { message: 'Inquiries fetched successfully', data };
  }

  @Post('inspections')
  @HttpCode(HttpStatus.CREATED)
  async createInspection(
    @CurrentUser() user: UserResponse,
    @Body() input: CreateInspectionDto,
  ) {
    const data = await this.engagements.upsertInspection(user.id, input);
    return { message: 'Inspection requested successfully', data };
  }

  @Get('inspections')
  async listInspections(@CurrentUser() user: UserResponse) {
    const data = await this.engagements.listInspections(user.id);
    return { message: 'Inspections fetched successfully', data };
  }

  @Post('offers')
  @HttpCode(HttpStatus.CREATED)
  async createOffer(
    @CurrentUser() user: UserResponse,
    @Body() input: CreateOfferDto,
  ) {
    const data = await this.engagements.upsertOffer(user.id, input);
    return { message: 'Offer submitted successfully', data };
  }

  @Get('offers')
  async listOffers(@CurrentUser() user: UserResponse) {
    const data = await this.engagements.listOffers(user.id);
    return { message: 'Offers fetched successfully', data };
  }

  @Post('rental-applications')
  @HttpCode(HttpStatus.CREATED)
  async createRentalApplication(
    @CurrentUser() user: UserResponse,
    @Body() input: CreateRentalApplicationDto,
  ) {
    const data = await this.engagements.upsertRentalApplication(user.id, input);
    return { message: 'Rental application submitted successfully', data };
  }

  @Get('rental-applications')
  async listRentalApplications(@CurrentUser() user: UserResponse) {
    const data = await this.engagements.listRentalApplications(user.id);
    return { message: 'Rental applications fetched successfully', data };
  }
}
