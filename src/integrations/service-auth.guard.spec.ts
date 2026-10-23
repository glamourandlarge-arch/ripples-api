import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Internal } from '../common/decorators/internal.decorator.js';
import { signRequest } from './handshake.js';
import { ServiceAuthGuard } from './service-auth.guard.js';

class Routes {
  @Internal()
  locked() {
    return true;
  }

  open() {
    return true;
  }
}

function contextFor(
  handler: () => boolean,
  headers: Record<string, string>,
  body = '',
): ExecutionContext {
  const request = {
    method: 'POST',
    originalUrl: '/api/internal/ping',
    header: (name: string) => headers[name.toLowerCase()],
    rawBody: Buffer.from(body),
  };

  return {
    getHandler: () => handler,
    getClass: () => Routes,
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('ServiceAuthGuard', () => {
  const routes = new Routes();
  const guard = new ServiceAuthGuard(new Reflector(), {
    getOrThrow: () => 'secret',
  } as unknown as ConfigService);

  it('leaves public routes open', () => {
    expect(guard.canActivate(contextFor(routes.open, {}))).toBe(true);
  });

  it('accepts a signed internal call and rejects a missing signature', () => {
    const body = '{"ok":true}';
    const timestamp = Date.now().toString();
    const signature = signRequest('secret', {
      method: 'POST',
      path: '/api/internal/ping',
      timestamp,
      body,
    });

    expect(
      guard.canActivate(
        contextFor(
          routes.locked,
          {
            'x-service-name': 'billing',
            'x-timestamp': timestamp,
            'x-signature': signature,
          },
          body,
        ),
      ),
    ).toBe(true);

    expect(() => guard.canActivate(contextFor(routes.locked, {}))).toThrow(
      UnauthorizedException,
    );
  });
});
