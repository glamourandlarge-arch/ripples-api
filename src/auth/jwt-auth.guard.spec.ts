import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { UsersService } from '../services/users.service.js';
import { Internal } from '../utils/decorators/internal.decorator.js';
import { Public } from '../utils/decorators/public.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';

class Routes {
  @Public()
  open() {
    return true;
  }

  @Internal()
  internal() {
    return true;
  }

  locked() {
    return true;
  }
}

function contextFor(
  handler: () => boolean,
  type: 'http' | 'rpc' = 'http',
  authorization?: string,
): ExecutionContext {
  const request = {
    headers: authorization ? { authorization } : {},
  };

  return {
    getHandler: () => handler,
    getClass: () => Routes,
    getType: () => type,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const routes = new Routes();
  let guard: JwtAuthGuard;

  beforeAll(async () => {
    const secret = '12345678901234567890123456789012';
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        JwtAuthGuard,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => secret },
        },
        {
          provide: UsersService,
          useValue: { findOne: () => Promise.reject(new Error('unused')) },
        },
      ],
    }).compile();

    guard = moduleRef.get(JwtAuthGuard);
  });

  it('allows public, internal, and non-http routes', () => {
    expect(guard.canActivate(contextFor(routes.open))).toBe(true);
    expect(guard.canActivate(contextFor(routes.internal))).toBe(true);
    expect(guard.canActivate(contextFor(routes.locked, 'rpc'))).toBe(true);
  });

  it('rejects a missing bearer token', async () => {
    await expect(guard.canActivate(contextFor(routes.locked))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
