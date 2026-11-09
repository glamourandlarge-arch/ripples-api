import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RateBucket = {
  timestamps: number[];
};

@Injectable()
export class OtpRateLimiterService {
  private readonly buckets = new Map<string, RateBucket>();

  constructor(private readonly config: ConfigService) {}

  consume(key: string): void {
    const max = this.config.getOrThrow<number>('OTP_RATE_LIMIT_MAX');
    const windowMs =
      this.config.getOrThrow<number>('OTP_RATE_LIMIT_WINDOW_SECONDS') * 1000;
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    const recent = bucket.timestamps.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    if (recent.length >= max) {
      throw new HttpException(
        'Too many verification codes requested. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.buckets.set(key, { timestamps: recent });
  }

  /** Test helper to clear in-memory state between cases. */
  reset(): void {
    this.buckets.clear();
  }
}
