import {
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
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(input: CreateUserDto): Promise<UserResponse> {
    try {
      const user = await this.users.save(this.users.create(input));
      return toUserResponse(user);
    } catch (error) {
      throw mapWriteError(error);
    }
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
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function mapWriteError(error: unknown): unknown {
  if (isUniqueViolation(error)) {
    return new ConflictException('A user with this email already exists');
  }
  return error;
}
