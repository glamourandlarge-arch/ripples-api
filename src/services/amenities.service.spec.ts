import type { Amenity } from '../amenities/amenity.entity.js';
import { toAmenityResponse } from './amenities.service.js';

describe('toAmenityResponse', () => {
  it('maps the stored amenity to the response', () => {
    const amenity = {
      id: '6f1b5d3a-3c2e-4a1b-9d0e-1a2b3c4d5e6f',
      name: 'Swimming pool',
      slug: 'swimming-pool',
      icon: 'swimming-pool',
      sortOrder: 13,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    } as Amenity;

    expect(toAmenityResponse(amenity)).toEqual({
      id: '6f1b5d3a-3c2e-4a1b-9d0e-1a2b3c4d5e6f',
      name: 'Swimming pool',
      slug: 'swimming-pool',
      icon: 'swimming-pool',
      sortOrder: 13,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });
});
