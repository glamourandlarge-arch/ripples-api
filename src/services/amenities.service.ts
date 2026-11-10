import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AMENITY_SEEDS } from '../amenities/amenities.seed.js';
import type { CreateAmenityDto } from '../amenities/create-amenity.dto.js';
import { Amenity } from '../amenities/amenity.entity.js';
import type { UpdateAmenityDto } from '../amenities/update-amenity.dto.js';
import { isUniqueViolation } from '../utils/is-unique-violation.js';

export type AmenityResponse = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class AmenitiesService implements OnModuleInit {
  private readonly logger = new Logger(AmenitiesService.name);

  constructor(
    @InjectRepository(Amenity)
    private readonly amenities: Repository<Amenity>,
  ) {}

  async onModuleInit() {
    const count = await this.amenities.count();
    if (count > 0) {
      return;
    }

    await this.amenities.save(
      AMENITY_SEEDS.map((seed) =>
        this.amenities.create({
          name: seed.name,
          slug: seed.slug,
          icon: seed.icon,
          sortOrder: seed.sortOrder,
          isActive: true,
        }),
      ),
    );
    this.logger.log(`Seeded ${AMENITY_SEEDS.length} amenities`);
  }

  async create(input: CreateAmenityDto): Promise<AmenityResponse> {
    try {
      const amenity = await this.amenities.save(
        this.amenities.create({
          name: input.name,
          slug: input.slug,
          icon: input.icon,
          sortOrder: input.sortOrder ?? (await this.nextSortOrder()),
          isActive: input.isActive ?? true,
        }),
      );
      return toAmenityResponse(amenity);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async findAll(includeInactive = false): Promise<AmenityResponse[]> {
    const rows = await this.amenities.find({
      where: includeInactive ? undefined : { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return rows.map((row) => toAmenityResponse(row));
  }

  async findOne(id: string): Promise<AmenityResponse> {
    return toAmenityResponse(await this.findAmenity(id));
  }

  async update(id: string, input: UpdateAmenityDto): Promise<AmenityResponse> {
    const amenity = await this.findAmenity(id);
    if (input.name !== undefined) {
      amenity.name = input.name;
    }
    if (input.slug !== undefined) {
      amenity.slug = input.slug;
    }
    if (input.icon !== undefined) {
      amenity.icon = input.icon;
    }
    if (input.sortOrder !== undefined) {
      amenity.sortOrder = input.sortOrder;
    }
    if (input.isActive !== undefined) {
      amenity.isActive = input.isActive;
    }

    try {
      return toAmenityResponse(await this.amenities.save(amenity));
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.amenities.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('Amenity not found');
    }
  }

  private async findAmenity(id: string): Promise<Amenity> {
    const amenity = await this.amenities.findOneBy({ id });
    if (!amenity) {
      throw new NotFoundException('Amenity not found');
    }
    return amenity;
  }

  private async nextSortOrder(): Promise<number> {
    const latest = await this.amenities.find({
      order: { sortOrder: 'DESC' },
      take: 1,
    });
    return (latest[0]?.sortOrder ?? 0) + 1;
  }
}

export function toAmenityResponse(amenity: Amenity): AmenityResponse {
  return {
    id: amenity.id,
    name: amenity.name,
    slug: amenity.slug,
    icon: amenity.icon,
    sortOrder: amenity.sortOrder,
    isActive: amenity.isActive,
    createdAt: amenity.createdAt.toISOString(),
    updatedAt: amenity.updatedAt.toISOString(),
  };
}

function mapWriteError(error: unknown): unknown {
  if (isUniqueViolation(error)) {
    return new ConflictException('An amenity with this slug already exists');
  }
  return error;
}
