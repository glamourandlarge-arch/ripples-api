import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter.js';

function hostWithResponse() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ originalUrl: '/api/test' }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();

  it('formats validation failures as 422 with field errors', () => {
    const { host, status, json } = hostWithResponse();

    filter.catch(
      new UnprocessableEntityException({
        message: 'email must be an email',
        errors: { email: ['email must be an email'] },
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith({
      status: false,
      message: 'email must be an email',
      data: [],
      errors: { email: ['email must be an email'] },
    });
  });

  it('formats unauthorized exceptions', () => {
    const { host, status, json } = hostWithResponse();

    filter.catch(new UnauthorizedException(), host);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      status: false,
      message: 'Access Denied! Please provide a valid token.',
      data: null,
      errors: null,
    });
  });

  it('formats not found exceptions', () => {
    const { host, status, json } = hostWithResponse();

    filter.catch(new NotFoundException('User not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      status: false,
      message: 'User not found',
      data: [],
      errors: {},
    });
  });

  it('rewrites framework route-miss messages', () => {
    const { host, status, json } = hostWithResponse();

    filter.catch(new NotFoundException('Cannot GET /api/missing'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      status: false,
      message: 'The requested resource was not found',
      data: [],
      errors: {},
    });
  });

  it('formats forbidden and bad request exceptions', () => {
    const forbidden = hostWithResponse();
    filter.catch(
      new ForbiddenException('Only a Partner Growth Manager can claim a partner.'),
      forbidden.host,
    );
    expect(forbidden.status).toHaveBeenCalledWith(403);
    expect(forbidden.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: false,
        message: 'Only a Partner Growth Manager can claim a partner.',
      }),
    );

    const badRequest = hostWithResponse();
    filter.catch(new BadRequestException('Validation input is invalid'), badRequest.host);
    expect(badRequest.status).toHaveBeenCalledWith(400);
  });
});
