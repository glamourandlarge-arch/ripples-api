import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../utils/is-unique-violation.js';
import type { CreateUserDto } from '../users/create-user.dto.js';
import type { UpdateUserDto } from '../users/update-user.dto.js';
import { User } from '../users/user.entity.js';

export type UserResponse = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  hasPassword: boolean;
  sessionVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountInput = {
  email: string;
  name: string;
  passwordHash: string;
  phone?: string | null;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(input: CreateUserDto): Promise<UserResponse> {
    return this.saveUser({
      email: input.email,
      name: input.name,
      phone: null,
      passwordHash: null,
    });
  }

  async createAccount(input: CreateAccountInput): Promise<UserResponse> {
    return this.saveUser({
      email: input.email,
      name: input.name,
      phone: input.phone ?? null,
      passwordHash: input.passwordHash,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: email.trim().toLowerCase() });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.users.findOneBy({ phone });
  }

  async findOrCreateByPhone(phone: string): Promise<UserResponse> {
    const existing = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.phone = :phone', { phone })
      .getOne();
    if (existing) {
      return toUserResponse(await this.ensureSystemUsername(existing, phone));
    }

    return this.saveUser({
      email: null,
      phone,
      name: createGenericUsername(phone),
      passwordHash: null,
    });
  }

  async findAll(): Promise<UserResponse[]> {
    const users = await this.users.find({
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return users.map((user) => toUserResponse(user));
  }

  async findOne(id: string): Promise<UserResponse> {
    return toUserResponse(await this.findUserWithPassword(id));
  }

  async findAuthAccount(id: string): Promise<User> {
    return this.findUserWithPassword(id);
  }

  async setPasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<UserResponse> {
    const user = await this.findUserWithPassword(id);
    user.passwordHash = passwordHash;
    user.sessionVersion += 1;
    return toUserResponse(await this.users.save(user));
  }

  async bumpSessionVersion(id: string): Promise<UserResponse> {
    const user = await this.findUser(id);
    user.sessionVersion += 1;
    return toUserResponse(await this.users.save(user));
  }

  async update(id: string, input: UpdateUserDto): Promise<UserResponse> {
    const user = await this.findUser(id);
    if (input.name !== undefined) {
      user.name = input.name;
    }
    assertHasContact(user);

    try {
      await this.users.save(user);
      return this.findOne(id);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async updateContact(
    id: string,
    input: { email?: string; phone?: string },
  ): Promise<UserResponse> {
    const user = await this.findUser(id);
    if (input.email !== undefined) {
      user.email = input.email;
    }
    if (input.phone !== undefined) {
      user.phone = input.phone;
    }
    assertHasContact(user);

    try {
      await this.users.save(user);
      return this.findOne(id);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.users.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('User not found');
    }
  }

  private async saveUser(input: {
    email: string | null;
    phone?: string | null;
    name: string;
    passwordHash: string | null;
  }): Promise<UserResponse> {
    assertHasContact(input);

    try {
      const user = await this.users.save(
        this.users.create({
          email: input.email,
          phone: input.phone ?? null,
          name: input.name,
          passwordHash: input.passwordHash,
        }),
      );
      return toUserResponse(user);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  private async findUser(id: string): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.ensureSystemUsername(user, user.phone);
  }

  private async findUserWithPassword(id: string): Promise<User> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.ensureSystemUsername(user, user.phone);
  }

  private async ensureSystemUsername(
    user: User,
    phone: string | null,
  ): Promise<User> {
    if (!needsSystemUsername(user.name)) {
      return user;
    }

    user.name = createGenericUsername(phone ?? user.id);
    return this.users.save(user);
  }
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    hasPassword: Boolean(user.passwordHash),
    sessionVersion: user.sessionVersion ?? 0,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

const LEGACY_PLACEHOLDER_NAMES = new Set(['ripples user', 'rippler user']);

function needsSystemUsername(name: string | null | undefined): boolean {
  const normalized = name?.trim().toLowerCase() ?? '';
  return !normalized || LEGACY_PLACEHOLDER_NAMES.has(normalized);
}

export function createGenericUsername(seed: string): string {
  const lastDigits = seed.replace(/\D/g, '').slice(-4) || '0000';
  const suffix = randomBytes(2).toString('hex');
  return `ripple_${lastDigits}${suffix}`;
}

function assertHasContact(input: {
  email?: string | null;
  phone?: string | null;
}): void {
  if (!input.email && !input.phone) {
    throw new BadRequestException('A user requires an email or phone number');
  }
}

function mapWriteError(error: unknown): unknown {
  if (isUniqueViolation(error)) {
    const detail =
      error instanceof Error &&
      'driverError' in error &&
      typeof error.driverError === 'object' &&
      error.driverError !== null &&
      'detail' in error.driverError &&
      typeof error.driverError.detail === 'string'
        ? error.driverError.detail
        : '';
    if (detail.includes('(phone)')) {
      return new ConflictException(
        'A user with this phone number already exists',
      );
    }
    return new ConflictException('A user with this email already exists');
  }
  return error;
}
