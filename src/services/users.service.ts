import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountInput = {
  email: string;
  name: string;
  passwordHash: string;
  phone?: string | null;
};

const DEFAULT_PHONE_USER_NAME = 'Ripples user';

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
    const existing = await this.findByPhone(phone);
    if (existing) {
      return toUserResponse(existing);
    }

    return this.saveUser({
      email: null,
      phone,
      name: DEFAULT_PHONE_USER_NAME,
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
    return toUserResponse(await this.findUser(id));
  }

  async update(id: string, input: UpdateUserDto): Promise<UserResponse> {
    const user = await this.findUser(id);
    if (input.email !== undefined) {
      user.email = input.email;
    }
    if (input.name !== undefined) {
      user.name = input.name;
    }
    assertHasContact(user);

    try {
      return toUserResponse(await this.users.save(user));
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
    return user;
  }
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
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
