import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { INTERNAL_ROUTE } from '../common/decorators/internal.decorator.js';
import { HandshakeError, requestPath, verifyHandshake } from './handshake.js';

type HandshakeRequest = Request & {
  rawBody?: Buffer;
};

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const internal = this.reflector.getAllAndOverride<boolean>(INTERNAL_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!internal) {
      return true;
    }

    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<HandshakeRequest>();
    try {
      verifyHandshake({
        method: request.method,
        path: requestPath(request.originalUrl),
        timestamp: request.header('x-timestamp'),
        signature: request.header('x-signature'),
        serviceName: request.header('x-service-name'),
        body: request.rawBody?.toString('utf8') ?? '',
        secret: this.config.getOrThrow<string>('SERVICE_SHARED_SECRET'),
      });
    } catch (error) {
      if (error instanceof HandshakeError) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }

    return true;
  }
}
