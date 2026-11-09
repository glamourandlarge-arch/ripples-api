import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { randomInt, randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import {
  toUserResponse,
  UsersService,
  type UserResponse,
} from '../services/users.service.js';
import { AccessTokenRevocationService } from './access-token-revocation.service.js';
import { EMAIL_SENDER, type EmailSender } from './email-sender.js';
import type { JwtPayload } from './jwt-payload.js';
import type { LoginDto } from './login.dto.js';
import {
  OtpChallenge,
  type OtpChannel,
  type OtpPurpose,
} from './otp-challenge.entity.js';
import { OtpRateLimiterService } from './otp-rate-limiter.service.js';
import type { ChangePasswordDto } from './change-password.dto.js';
import type { RegisterDto } from './register.dto.js';
import type { SendContactOtpDto } from './send-contact-otp.dto.js';
import type { SendOtpDto } from './send-otp.dto.js';
import { SMS_SENDER, type SmsSender } from './sms-sender.js';
import type { VerifyContactOtpDto } from './verify-contact-otp.dto.js';
import type { VerifyOtpDto } from './verify-otp.dto.js';

const BCRYPT_ROUNDS = 12;
const OTP_MAX_ATTEMPTS = 5;

export type AuthResponse = {
  accessToken: string;
  user: UserResponse;
};

export type SendOtpResponse = {
  ok: true;
  debugCode?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(OtpChallenge)
    private readonly challenges: Repository<OtpChallenge>,
    @Inject(SMS_SENDER) private readonly sms: SmsSender,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    private readonly otpRateLimiter: OtpRateLimiterService,
    private readonly revokedAccessTokens: AccessTokenRevocationService,
  ) {}

  async register(input: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await hash(input.password, BCRYPT_ROUNDS);
    const user = await this.users.createAccount({
      email: input.email,
      name: input.name,
      passwordHash,
    });
    return {
      accessToken: await this.sign(user),
      user,
    };
  }

  async login(input: LoginDto): Promise<AuthResponse> {
    const account = await this.users.findByEmailWithPassword(input.email);
    const matches = await passwordMatches(
      input.password,
      account?.passwordHash,
    );
    if (!account || !matches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = toUserResponse(account);
    return {
      accessToken: await this.sign(user),
      user,
    };
  }

  async sendOtp(input: SendOtpDto): Promise<SendOtpResponse> {
    const phone = input.phone;
    this.otpRateLimiter.consume(`login:phone:${phone}`);
    const { code, expiresAt, codeHash } = await this.createCode();

    await this.challenges.delete({
      phone,
      purpose: 'login',
      channel: 'phone',
    });
    await this.challenges.save(
      this.challenges.create({
        phone,
        email: null,
        channel: 'phone',
        purpose: 'login',
        userId: null,
        codeHash,
        expiresAt,
        attempts: 0,
      }),
    );

    await this.sms.sendOtp(phone, code);
    return this.toSendResponse(code);
  }

  async sendContactOtp(
    user: UserResponse,
    input: SendContactOtpDto,
  ): Promise<SendOtpResponse> {
    const target = resolveContactTarget(input);
    this.assertContactCanBeAdded(user, target);
    this.otpRateLimiter.consume(
      `contact:${user.id}:${target.channel}:${target.value}`,
    );

    if (target.channel === 'email') {
      const existing = await this.users.findByEmail(target.value);
      if (existing && existing.id !== user.id) {
        throw new ConflictException('A user with this email already exists');
      }
    } else {
      const existing = await this.users.findByPhone(target.value);
      if (existing && existing.id !== user.id) {
        throw new ConflictException(
          'A user with this phone number already exists',
        );
      }
    }

    const { code, expiresAt, codeHash } = await this.createCode();
    await this.deleteContactChallenges(user.id, target);

    await this.challenges.save(
      this.challenges.create({
        phone: target.channel === 'phone' ? target.value : null,
        email: target.channel === 'email' ? target.value : null,
        channel: target.channel,
        purpose: 'contact_update',
        userId: user.id,
        codeHash,
        expiresAt,
        attempts: 0,
      }),
    );

    if (target.channel === 'email') {
      await this.email.sendOtp(target.value, code);
    } else {
      await this.sms.sendOtp(target.value, code);
    }

    return this.toSendResponse(code);
  }

  async changePassword(
    user: UserResponse,
    input: ChangePasswordDto,
  ): Promise<AuthResponse> {
    const account = await this.users.findAuthAccount(user.id);
    if (account.passwordHash) {
      if (!input.currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const matches = await passwordMatches(
        input.currentPassword,
        account.passwordHash,
      );
      if (!matches) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    const passwordHash = await hash(input.newPassword, BCRYPT_ROUNDS);
    const updated = await this.users.setPasswordHash(user.id, passwordHash);
    return {
      accessToken: await this.sign(updated),
      user: updated,
    };
  }

  async logout(accessToken: string): Promise<void> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(accessToken);
    } catch {
      throw new UnauthorizedException();
    }

    if (!payload.jti || typeof payload.exp !== 'number') {
      throw new UnauthorizedException();
    }

    await this.revokedAccessTokens.revoke(
      payload.jti,
      new Date(payload.exp * 1000),
    );
    await this.revokedAccessTokens.purgeExpired();
  }

  async logoutAll(user: UserResponse, accessToken: string): Promise<void> {
    await this.users.bumpSessionVersion(user.id);
    try {
      await this.logout(accessToken);
    } catch {
      // Session version bump already invalidates outstanding tokens.
    }
  }

  async verifyOtp(input: VerifyOtpDto): Promise<AuthResponse> {
    const challenge = await this.challenges.findOne({
      where: {
        phone: input.phone,
        purpose: 'login',
        channel: 'phone',
      },
      order: { createdAt: 'DESC' },
    });

    await this.assertValidChallenge(challenge, input.code);
    await this.challenges.delete({ id: challenge!.id });
    const user = await this.users.findOrCreateByPhone(input.phone);
    return {
      accessToken: await this.sign(user),
      user,
    };
  }

  async verifyContactOtp(
    user: UserResponse,
    input: VerifyContactOtpDto,
  ): Promise<UserResponse> {
    const target = resolveContactTarget(input);
    this.assertContactCanBeAdded(user, target);
    const challenge = await this.challenges.findOne({
      where: {
        userId: user.id,
        purpose: 'contact_update',
        channel: target.channel,
        ...(target.channel === 'email'
          ? { email: target.value }
          : { phone: target.value }),
      },
      order: { createdAt: 'DESC' },
    });

    await this.assertValidChallenge(challenge, input.code);
    await this.challenges.delete({ id: challenge!.id });

    return this.users.updateContact(
      user.id,
      target.channel === 'email'
        ? { email: target.value }
        : { phone: target.value },
    );
  }

  private assertContactCanBeAdded(
    user: UserResponse,
    target: ContactTarget,
  ): void {
    if (target.channel === 'email' && user.email) {
      throw new BadRequestException(
        'Email cannot be changed once it has been added',
      );
    }
    if (target.channel === 'phone' && user.phone) {
      throw new BadRequestException(
        'Phone number cannot be changed once it has been added',
      );
    }
  }

  private async createCode(): Promise<{
    code: string;
    codeHash: string;
    expiresAt: Date;
  }> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const ttlSeconds = this.config.getOrThrow<number>('OTP_TTL_SECONDS');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const codeHash = await hash(code, BCRYPT_ROUNDS);
    return { code, codeHash, expiresAt };
  }

  private toSendResponse(code: string): SendOtpResponse {
    const response: SendOtpResponse = { ok: true };
    if (this.config.getOrThrow<boolean>('OTP_DEBUG')) {
      response.debugCode = code;
    }
    return response;
  }

  private async deleteContactChallenges(
    userId: string,
    target: ContactTarget,
  ): Promise<void> {
    await this.challenges.delete({
      userId,
      purpose: 'contact_update' satisfies OtpPurpose,
      channel: target.channel,
      ...(target.channel === 'email'
        ? { email: target.value }
        : { phone: target.value }),
    });
  }

  private async assertValidChallenge(
    challenge: OtpChallenge | null,
    code: string,
  ): Promise<void> {
    if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
      if (challenge) {
        await this.challenges.delete({ id: challenge.id });
      }
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      await this.challenges.delete({ id: challenge.id });
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    const matches = await compare(code, challenge.codeHash);
    if (!matches) {
      challenge.attempts += 1;
      if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
        await this.challenges.delete({ id: challenge.id });
      } else {
        await this.challenges.save(challenge);
      }
      throw new UnauthorizedException('Invalid or expired verification code');
    }
  }

  private sign(user: UserResponse): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      jti: randomUUID(),
      sv: user.sessionVersion ?? 0,
    };
    return this.jwt.signAsync(payload);
  }
}

type ContactTarget = {
  channel: OtpChannel;
  value: string;
};

function resolveContactTarget(input: {
  email?: string;
  phone?: string;
}): ContactTarget {
  const email = input.email?.trim().toLowerCase();
  const phone = input.phone?.trim();

  if (email && phone) {
    throw new BadRequestException('Provide either an email or a phone number');
  }
  if (email) {
    return { channel: 'email', value: email };
  }
  if (phone) {
    return { channel: 'phone', value: phone };
  }
  throw new BadRequestException('Provide an email or phone number to verify');
}

async function passwordMatches(
  password: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  return compare(password, passwordHash);
}
