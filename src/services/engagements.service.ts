import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateInquiryDto } from '../engagements/create-inquiry.dto.js';
import type { CreateInspectionDto } from '../engagements/create-inspection.dto.js';
import type { CreateOfferDto } from '../engagements/create-offer.dto.js';
import type { CreateRentalApplicationDto } from '../engagements/create-rental-application.dto.js';
import { PropertyInquiry } from '../engagements/inquiry.entity.js';
import { PropertyInspection } from '../engagements/inspection.entity.js';
import { PropertyOffer } from '../engagements/offer.entity.js';
import { PropertyRentalApplication } from '../engagements/rental-application.entity.js';

export type InquiryResponse = {
  id: string;
  propertyId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type InspectionResponse = {
  id: string;
  propertyId: string;
  date: string;
  time: string;
  notes: string;
  stage: string;
  protected: boolean;
  fee: number;
  createdAt: string;
  updatedAt: string;
};

export type OfferResponse = {
  id: string;
  propertyId: string;
  askingPrice: number;
  amount: number;
  conditions: string;
  message: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
};

export type RentalApplicationResponse = {
  id: string;
  propertyId: string;
  fullName: string;
  phone: string;
  employmentStatus: string;
  moveInDate: string;
  occupants: number;
  message: string;
  documentNames: string[];
  status: string;
  submittedAt: string;
  updatedAt: string;
};

export type EngagementsSummary = {
  inquiries: InquiryResponse[];
  inspections: InspectionResponse[];
  offers: OfferResponse[];
  rentalApplications: RentalApplicationResponse[];
};

@Injectable()
export class EngagementsService {
  constructor(
    @InjectRepository(PropertyInquiry)
    private readonly inquiries: Repository<PropertyInquiry>,
    @InjectRepository(PropertyInspection)
    private readonly inspections: Repository<PropertyInspection>,
    @InjectRepository(PropertyOffer)
    private readonly offers: Repository<PropertyOffer>,
    @InjectRepository(PropertyRentalApplication)
    private readonly applications: Repository<PropertyRentalApplication>,
  ) {}

  async createInquiry(
    userId: string,
    input: CreateInquiryDto,
  ): Promise<InquiryResponse> {
    const row = await this.inquiries.save(
      this.inquiries.create({
        userId,
        propertyId: input.propertyId,
        message: input.message,
      }),
    );
    return toInquiryResponse(row);
  }

  async listInquiries(userId: string): Promise<InquiryResponse[]> {
    const rows = await this.inquiries.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(toInquiryResponse);
  }

  async upsertInspection(
    userId: string,
    input: CreateInspectionDto,
  ): Promise<InspectionResponse> {
    const existing = await this.inspections.findOneBy({
      userId,
      propertyId: input.propertyId,
    });
    if (existing) {
      existing.date = input.date;
      existing.time = input.time;
      existing.notes = input.notes?.trim() ?? '';
      existing.protected = input.protected ?? existing.protected;
      existing.fee = input.fee ?? existing.fee;
      return toInspectionResponse(await this.inspections.save(existing));
    }

    const row = await this.inspections.save(
      this.inspections.create({
        userId,
        propertyId: input.propertyId,
        date: input.date,
        time: input.time,
        notes: input.notes?.trim() ?? '',
        stage: 'awaiting-confirmation',
        protected: input.protected ?? false,
        fee: input.fee ?? 0,
      }),
    );
    return toInspectionResponse(row);
  }

  async listInspections(userId: string): Promise<InspectionResponse[]> {
    const rows = await this.inspections.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(toInspectionResponse);
  }

  async upsertOffer(
    userId: string,
    input: CreateOfferDto,
  ): Promise<OfferResponse> {
    const existing = await this.offers.findOneBy({
      userId,
      propertyId: input.propertyId,
    });
    if (existing) {
      existing.askingPrice = input.askingPrice;
      existing.amount = input.amount;
      existing.conditions = input.conditions?.trim() ?? '';
      existing.message = input.message;
      return toOfferResponse(await this.offers.save(existing));
    }

    const row = await this.offers.save(
      this.offers.create({
        userId,
        propertyId: input.propertyId,
        askingPrice: input.askingPrice,
        amount: input.amount,
        conditions: input.conditions?.trim() ?? '',
        message: input.message,
        status: 'new',
      }),
    );
    return toOfferResponse(row);
  }

  async listOffers(userId: string): Promise<OfferResponse[]> {
    const rows = await this.offers.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(toOfferResponse);
  }

  async upsertRentalApplication(
    userId: string,
    input: CreateRentalApplicationDto,
  ): Promise<RentalApplicationResponse> {
    const existing = await this.applications.findOneBy({
      userId,
      propertyId: input.propertyId,
    });
    if (existing) {
      existing.fullName = input.fullName;
      existing.phone = input.phone;
      existing.employmentStatus = input.employmentStatus;
      existing.moveInDate = input.moveInDate;
      existing.occupants = input.occupants;
      existing.message = input.message?.trim() ?? '';
      existing.documentNames = input.documentNames ?? [];
      return toRentalApplicationResponse(await this.applications.save(existing));
    }

    const row = await this.applications.save(
      this.applications.create({
        userId,
        propertyId: input.propertyId,
        fullName: input.fullName,
        phone: input.phone,
        employmentStatus: input.employmentStatus,
        moveInDate: input.moveInDate,
        occupants: input.occupants,
        message: input.message?.trim() ?? '',
        documentNames: input.documentNames ?? [],
        status: 'submitted',
      }),
    );
    return toRentalApplicationResponse(row);
  }

  async listRentalApplications(
    userId: string,
  ): Promise<RentalApplicationResponse[]> {
    const rows = await this.applications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(toRentalApplicationResponse);
  }

  async summary(userId: string): Promise<EngagementsSummary> {
    const [inquiries, inspections, offers, rentalApplications] =
      await Promise.all([
        this.listInquiries(userId),
        this.listInspections(userId),
        this.listOffers(userId),
        this.listRentalApplications(userId),
      ]);
    return { inquiries, inspections, offers, rentalApplications };
  }
}

function toInquiryResponse(row: PropertyInquiry): InquiryResponse {
  return {
    id: row.id,
    propertyId: row.propertyId,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toInspectionResponse(row: PropertyInspection): InspectionResponse {
  return {
    id: row.id,
    propertyId: row.propertyId,
    date: stringifyDate(row.date),
    time: row.time,
    notes: row.notes,
    stage: row.stage,
    protected: row.protected,
    fee: row.fee,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toOfferResponse(row: PropertyOffer): OfferResponse {
  return {
    id: row.id,
    propertyId: row.propertyId,
    askingPrice: row.askingPrice,
    amount: row.amount,
    conditions: row.conditions,
    message: row.message,
    status: row.status,
    submittedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRentalApplicationResponse(
  row: PropertyRentalApplication,
): RentalApplicationResponse {
  return {
    id: row.id,
    propertyId: row.propertyId,
    fullName: row.fullName,
    phone: row.phone,
    employmentStatus: row.employmentStatus,
    moveInDate: stringifyDate(row.moveInDate),
    occupants: row.occupants,
    message: row.message,
    documentNames: row.documentNames ?? [],
    status: row.status,
    submittedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function stringifyDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}
