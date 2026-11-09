import type { User } from '../users/user.entity.js';
import { toUserResponse } from './users.service.js';

describe('toUserResponse', () => {
  it('maps the stored user to the response', () => {
    const user = {
      id: '6f1b5d3a-3c2e-4a1b-9d0e-1a2b3c4d5e6f',
      email: 'ada@example.com',
      phone: '+2348012345678',
      name: 'Ada Lovelace',
      passwordHash: '$2b$12$secret',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    } as User;

    expect(toUserResponse(user)).toEqual({
      id: '6f1b5d3a-3c2e-4a1b-9d0e-1a2b3c4d5e6f',
      email: 'ada@example.com',
      phone: '+2348012345678',
      name: 'Ada Lovelace',
      hasPassword: true,
      sessionVersion: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('allows phone-only users', () => {
    const user = {
      id: '6f1b5d3a-3c2e-4a1b-9d0e-1a2b3c4d5e6f',
      email: null,
      phone: '+2348012345678',
      name: 'ripple_5678abcd',
      passwordHash: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    } as User;

    expect(toUserResponse(user)).toMatchObject({
      email: null,
      phone: '+2348012345678',
      name: 'ripple_5678abcd',
    });
  });
});
