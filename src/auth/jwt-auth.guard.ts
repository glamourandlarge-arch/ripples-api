import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { INTERNAL_ROUTE } from '../utils/decorators/internal.decorator.js';
import { IS_PUBLIC } from '../utils/decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isInternal = this.reflector.getAllAndOverride<boolean>(
      INTERNAL_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic || isInternal || context.getType() !== 'http') {
      return true;
    }

    return super.canActivate(context);
  }
}
