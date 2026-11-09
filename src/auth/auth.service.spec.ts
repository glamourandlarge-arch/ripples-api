import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { hash } from 'bcrypt';
import type { Repository } from 'typeorm';
import type { UsersService } from '../services/users.service.js';
import type { AccessTokenRevocationService } from './access-token-revocation.service.js';
import { AuthService } from './auth.service.js';
import type { OtpChallenge } from './otp-challenge.entity.js';
import type { EmailSender } from './email-sender.js';
import { OtpRateLimiterService } from './otp-rate-limiter.service.js';
import type { SmsSender } from './sms-sender.js';

describe('AuthService', () => {
  const user = {
    id: '6f1b5d3a-3c2e-4a1b-9d0e-1a2b3c4d5e6f',
    email: 'ada@example.com',
    phone: null as string | null,
    name: 'Ada Lovelace',
    hasPassword: true,
    sessionVersion: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };

  const phoneUser = {
    id: '7a2c6e4b-4d3f-5b2c-0e1f-2b3c4d5e6f7a',
    email: null as string | null,
    phone: '+2348012345678',
    name: 'ripple_5678abcd',
    hasPassword: false,
    sessionVersion: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };

  function createService({
    users = {},
    challenges = {},
    sms = { sendOtp: vi.fn().mockResolvedValue(undefined) },
    email = { sendOtp: vi.fn().mockResolvedValue(undefined) },
    otpDebug = true,
    otpTtlSeconds = 300,
    revoked = {},
  }: {
    users?: Partial<UsersService>;
    challenges?: Partial<Repository<OtpChallenge>>;
    sms?: SmsSender;
    email?: EmailSender;
    otpDebug?: boolean;
    otpTtlSeconds?: number;
    revoked?: Partial<AccessTokenRevocationService>;
  } = {}) {
    const jwt = {
      signAsync: vi.fn().mockResolvedValue('signed-token'),
      verifyAsync: vi.fn(),
    };
    const config = {
      getOrThrow: vi.fn((key: string) => {
        if (key === 'OTP_TTL_SECONDS') return otpTtlSeconds;
        if (key === 'OTP_DEBUG') return otpDebug;
        if (key === 'OTP_RATE_LIMIT_MAX') return 20;
        if (key === 'OTP_RATE_LIMIT_WINDOW_SECONDS') return 900;
        throw new Error(`unexpected config key ${key}`);
      }),
    };
    const challengeRepo = {
      delete: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockImplementation(async (value) => value),
      create: vi.fn().mockImplementation((value) => value),
      findOne: vi.fn(),
      ...challenges,
    };
    const revokedAccessTokens = {
      revoke: vi.fn().mockResolvedValue(undefined),
      isRevoked: vi.fn().mockResolvedValue(false),
      purgeExpired: vi.fn().mockResolvedValue(undefined),
      ...revoked,
    };
    const otpRateLimiter = new OtpRateLimiterService(
      config as unknown as ConfigService,
    );

    return {
      auth: new AuthService(
        users as UsersService,
        jwt as unknown as JwtService,
        config as unknown as ConfigService,
        challengeRepo as unknown as Repository<OtpChallenge>,
        sms,
        email,
        otpRateLimiter,
        revokedAccessTokens as unknown as AccessTokenRevocationService,
      ),
      jwt,
      challengeRepo,
      sms,
      email,
      otpRateLimiter,
      revokedAccessTokens,
    };
  }

  it('register returns a token and omits the password hash', async () => {
    const createAccount = vi.fn().mockResolvedValue(user);
    const { auth } = createService({ users: { createAccount } });

    const result = await auth.register({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      password: 'correct-horse',
    });

    expect(result).toEqual({ accessToken: 'signed-token', user });
    expect(result.user).not.toHaveProperty('passwordHash');
    const saved = createAccount.mock.calls[0]?.[0] as {
      passwordHash: string;
    };
    expect(saved.passwordHash).not.toBe('correct-horse');
    expect(saved.passwordHash.startsWith('$2')).toBe(true);
  });

  it('login rejects a bad password', async () => {
    const passwordHash = await hash('correct-horse', 4);
    const findByEmailWithPassword = vi.fn().mockResolvedValue({
      ...user,
      passwordHash,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    });
    const { auth, jwt } = createService({
      users: { findByEmailWithPassword },
    });

    await expect(
      auth.login({ email: 'ada@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('login rejects an account that has no password', async () => {
    const findByEmailWithPassword = vi.fn().mockResolvedValue({
      ...user,
      passwordHash: null,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    });
    const { auth } = createService({ users: { findByEmailWithPassword } });

    await expect(
      auth.login({ email: 'ada@example.com', password: 'correct-horse' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
  });

  it('sendOtp stores a challenge and returns a debug code when enabled', async () => {
    const { auth, challengeRepo, sms } = createService();

    const result = await auth.sendOtp({ phone: '+2348012345678' });

    expect(result.ok).toBe(true);
    expect(result.debugCode).toMatch(/^\d{6}$/);
    expect(challengeRepo.delete).toHaveBeenCalledWith({
      phone: '+2348012345678',
      purpose: 'login',
      channel: 'phone',
    });
    expect(challengeRepo.save).toHaveBeenCalled();
    expect(sms.sendOtp).toHaveBeenCalledWith(
      '+2348012345678',
      result.debugCode,
    );
  });

  it('sendContactOtp emails a code for the authenticated user', async () => {
    const findByEmail = vi.fn().mockResolvedValue(null);
    const { auth, challengeRepo, email } = createService({
      users: { findByEmail },
    });

    const result = await auth.sendContactOtp(phoneUser, {
      email: 'new@example.com',
    });

    expect(result.ok).toBe(true);
    expect(result.debugCode).toMatch(/^\d{6}$/);
    expect(challengeRepo.save).toHaveBeenCalled();
    expect(email.sendOtp).toHaveBeenCalledWith(
      'new@example.com',
      result.debugCode,
    );
  });

  it('verifyContactOtp updates the user contact after a valid code', async () => {
    const code = '123456';
    const codeHash = await hash(code, 4);
    const updated = { ...phoneUser, email: 'new@example.com' };
    const updateContact = vi.fn().mockResolvedValue(updated);
    const { auth } = createService({
      users: { updateContact },
      challenges: {
        findOne: vi.fn().mockResolvedValue({
          id: 'challenge-2',
          email: 'new@example.com',
          phone: null,
          channel: 'email',
          purpose: 'contact_update',
          userId: phoneUser.id,
          codeHash,
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 0,
        }),
      },
    });

    const result = await auth.verifyContactOtp(phoneUser, {
      email: 'new@example.com',
      code,
    });

    expect(result).toEqual(updated);
    expect(updateContact).toHaveBeenCalledWith(phoneUser.id, {
      email: 'new@example.com',
    });
  });

  it('verifyOtp upserts the phone user and returns a token', async () => {
    const code = '123456';
    const codeHash = await hash(code, 4);
    const findOrCreateByPhone = vi.fn().mockResolvedValue(phoneUser);
    const { auth, challengeRepo } = createService({
      users: { findOrCreateByPhone },
      challenges: {
        findOne: vi.fn().mockResolvedValue({
          id: 'challenge-1',
          phone: '+2348012345678',
          codeHash,
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 0,
        }),
      },
    });

    const result = await auth.verifyOtp({
      phone: '+2348012345678',
      code,
    });

    expect(result).toEqual({ accessToken: 'signed-token', user: phoneUser });
    expect(findOrCreateByPhone).toHaveBeenCalledWith('+2348012345678');
    expect(challengeRepo.delete).toHaveBeenCalledWith({ id: 'challenge-1' });
  });

  it('verifyOtp rejects a bad code and increments attempts', async () => {
    const codeHash = await hash('123456', 4);
    const challenge = {
      id: 'challenge-1',
      phone: '+2348012345678',
      codeHash,
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
    };
    const { auth, challengeRepo } = createService({
      challenges: {
        findOne: vi.fn().mockResolvedValue(challenge),
      },
    });

    await expect(
      auth.verifyOtp({ phone: '+2348012345678', code: '000000' }),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid or expired verification code'),
    );
    expect(challengeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ attempts: 1 }),
    );
  });

  it('verifyOtp rejects an expired challenge', async () => {
    const codeHash = await hash('123456', 4);
    const { auth, challengeRepo } = createService({
      challenges: {
        findOne: vi.fn().mockResolvedValue({
          id: 'challenge-1',
          phone: '+2348012345678',
          codeHash,
          expiresAt: new Date(Date.now() - 1_000),
          attempts: 0,
        }),
      },
    });

    await expect(
      auth.verifyOtp({ phone: '+2348012345678', code: '123456' }),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid or expired verification code'),
    );
    expect(challengeRepo.delete).toHaveBeenCalledWith({ id: 'challenge-1' });
  });

  it('logout revokes the access token jti', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const { auth, jwt, revokedAccessTokens } = createService();
    jwt.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
      jti: 'token-jti',
      exp: expiresAt,
    });

    await auth.logout('signed-token');

    expect(jwt.verifyAsync).toHaveBeenCalledWith('signed-token');
    expect(revokedAccessTokens.revoke).toHaveBeenCalledWith(
      'token-jti',
      new Date(expiresAt * 1000),
    );
    expect(revokedAccessTokens.purgeExpired).toHaveBeenCalled();
  });

  it('logout rejects a token without a jti', async () => {
    const { auth, jwt, revokedAccessTokens } = createService();
    jwt.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await expect(auth.logout('signed-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(revokedAccessTokens.revoke).not.toHaveBeenCalled();
  });

  it('changePassword updates the hash and returns a fresh token', async () => {
    const passwordHash = await hash('correct-horse', 4);
    const updated = {
      ...user,
      hasPassword: true,
      sessionVersion: 1,
    };
    const findAuthAccount = vi.fn().mockResolvedValue({
      ...user,
      passwordHash,
    });
    const setPasswordHash = vi.fn().mockResolvedValue(updated);
    const { auth } = createService({
      users: { findAuthAccount, setPasswordHash },
    });

    const result = await auth.changePassword(user, {
      currentPassword: 'correct-horse',
      newPassword: 'new-correct-horse',
    });

    expect(result).toEqual({ accessToken: 'signed-token', user: updated });
    expect(setPasswordHash).toHaveBeenCalledWith(
      user.id,
      expect.stringMatching(/^\$2/),
    );
  });

  it('logoutAll bumps the session version', async () => {
    const bumpSessionVersion = vi.fn().mockResolvedValue({
      ...user,
      sessionVersion: 1,
    });
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const { auth, jwt, revokedAccessTokens } = createService({
      users: { bumpSessionVersion },
    });
    jwt.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
      jti: 'token-jti',
      sv: 0,
      exp: expiresAt,
    });

    await auth.logoutAll(user, 'signed-token');

    expect(bumpSessionVersion).toHaveBeenCalledWith(user.id);
    expect(revokedAccessTokens.revoke).toHaveBeenCalled();
  });

  it('verifyOtp rejects when attempts are exhausted', async () => {
    const codeHash = await hash('123456', 4);
    const { auth, challengeRepo } = createService({
      challenges: {
        findOne: vi.fn().mockResolvedValue({
          id: 'challenge-1',
          phone: '+2348012345678',
          codeHash,
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 5,
        }),
      },
    });

    await expect(
      auth.verifyOtp({ phone: '+2348012345678', code: '123456' }),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid or expired verification code'),
    );
    expect(challengeRepo.delete).toHaveBeenCalledWith({ id: 'challenge-1' });
  });
});
