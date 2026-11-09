import { HttpException, HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { OtpRateLimiterService } from './otp-rate-limiter.service.js';

describe('OtpRateLimiterService', () => {
  function createLimiter(max = 2, windowSeconds = 60) {
    const config = {
      getOrThrow: vi.fn((key: string) => {
        if (key === 'OTP_RATE_LIMIT_MAX') return max;
        if (key === 'OTP_RATE_LIMIT_WINDOW_SECONDS') return windowSeconds;
        throw new Error(`unexpected config key ${key}`);
      }),
    };
    return new OtpRateLimiterService(config as unknown as ConfigService);
  }

  it('allows requests under the limit and blocks after', () => {
    const limiter = createLimiter(2);

    expect(() => limiter.consume('phone:+2348012345678')).not.toThrow();
    expect(() => limiter.consume('phone:+2348012345678')).not.toThrow();
    expect(() => limiter.consume('phone:+2348012345678')).toThrow(
      new HttpException(
        'Too many verification codes requested. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  });

  it('tracks keys independently', () => {
    const limiter = createLimiter(1);

    expect(() => limiter.consume('phone:+2348012345678')).not.toThrow();
    expect(() => limiter.consume('email:ada@example.com')).not.toThrow();
  });
});
