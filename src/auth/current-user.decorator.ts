import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserResponse } from '../services/users.service.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserResponse => {
    const request = context.switchToHttp().getRequest<{ user: UserResponse }>();
    return request.user;
  },
);
