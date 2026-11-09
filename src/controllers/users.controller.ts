import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import {
  UsersService,
  type UserResponse,
} from '../services/users.service.js';
import { UpdateUserDto } from '../users/update-user.dto.js';

@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll() {
    throw new ForbiddenException('Listing users is not allowed');
  }

  @Get(':id')
  async findOne(
    @CurrentUser() currentUser: UserResponse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    assertSelf(currentUser, id);
    const row = await this.users.findOne(id);
    return { message: 'User fetched successfully', data: row };
  }

  @Patch(':id')
  async update(
    @CurrentUser() currentUser: UserResponse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateUserDto,
  ) {
    assertSelf(currentUser, id);
    const row = await this.users.update(id, input);
    return { message: 'User updated successfully', data: row };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() currentUser: UserResponse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    assertSelf(currentUser, id);
    await this.users.remove(id);
  }
}

function assertSelf(currentUser: UserResponse, id: string): void {
  if (currentUser.id !== id) {
    throw new ForbiddenException('You can only access your own account');
  }
}
