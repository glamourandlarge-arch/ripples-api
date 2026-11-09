import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { RevokedAccessToken } from './revoked-access-token.entity.js';

@Injectable()
export class AccessTokenRevocationService {
  constructor(
    @InjectRepository(RevokedAccessToken)
    private readonly tokens: Repository<RevokedAccessToken>,
  ) {}

  async revoke(jti: string, expiresAt: Date): Promise<void> {
    await this.tokens.save(
      this.tokens.create({
        jti,
        expiresAt,
      }),
    );
  }

  async isRevoked(jti: string): Promise<boolean> {
    const entry = await this.tokens.findOneBy({ jti });
    if (!entry) {
      return false;
    }

    if (entry.expiresAt.getTime() <= Date.now()) {
      await this.tokens.delete({ jti });
      return false;
    }

    return true;
  }

  async purgeExpired(): Promise<void> {
    await this.tokens.delete({ expiresAt: LessThan(new Date()) });
  }
}
