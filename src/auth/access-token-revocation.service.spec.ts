import type { Repository } from 'typeorm';
import { AccessTokenRevocationService } from './access-token-revocation.service.js';
import type { RevokedAccessToken } from './revoked-access-token.entity.js';

describe('AccessTokenRevocationService', () => {
  function createService(
    tokens: Partial<Repository<RevokedAccessToken>> = {},
  ) {
    const repo = {
      save: vi.fn().mockImplementation(async (value) => value),
      create: vi.fn().mockImplementation((value) => value),
      findOneBy: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      ...tokens,
    };

    return {
      service: new AccessTokenRevocationService(
        repo as unknown as Repository<RevokedAccessToken>,
      ),
      repo,
    };
  }

  it('stores a revoked token', async () => {
    const { service, repo } = createService();
    const expiresAt = new Date('2026-01-02T00:00:00.000Z');

    await service.revoke('token-jti', expiresAt);

    expect(repo.create).toHaveBeenCalledWith({
      jti: 'token-jti',
      expiresAt,
    });
    expect(repo.save).toHaveBeenCalled();
  });

  it('reports an active revoked token', async () => {
    const { service, repo } = createService({
      findOneBy: vi.fn().mockResolvedValue({
        jti: 'token-jti',
        expiresAt: new Date(Date.now() + 60_000),
      }),
    });

    await expect(service.isRevoked('token-jti')).resolves.toBe(true);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('clears an expired revoked token', async () => {
    const { service, repo } = createService({
      findOneBy: vi.fn().mockResolvedValue({
        jti: 'token-jti',
        expiresAt: new Date(Date.now() - 1_000),
      }),
    });

    await expect(service.isRevoked('token-jti')).resolves.toBe(false);
    expect(repo.delete).toHaveBeenCalledWith({ jti: 'token-jti' });
  });
});
