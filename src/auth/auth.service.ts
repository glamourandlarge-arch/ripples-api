import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { randomInt } from 'node:crypto';
import { Repository } from 'typeorm';
import {
  toUserResponse,
  UsersService,
  type UserResponse,
} from '../services/users.service.js';
import type { LoginDto } from './login.dto.js';
import { OtpChallenge } from './otp-challenge.entity.js';
import type { RegisterDto } from './register.dto.js';
import type { SendOtpDto } from './send-otp.dto.js';
import { SMS_SENDER, type SmsSender } from './sms-sender.js';
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
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const ttlSeconds = this.config.getOrThrow<number>('OTP_TTL_SECONDS');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const codeHash = await hash(code, BCRYPT_ROUNDS);

    await this.challenges.delete({ phone });
    await this.challenges.save(
      this.challenges.create({
        phone,
        codeHash,
        expiresAt,
        attempts: 0,
      }),
    );

    await this.sms.sendOtp(phone, code);

    const response: SendOtpResponse = { ok: true };
    if (this.config.getOrThrow<boolean>('OTP_DEBUG')) {
      response.debugCode = code;
    }
    return response;
  }

  async verifyOtp(input: VerifyOtpDto): Promise<AuthResponse> {
    const challenge = await this.challenges.findOne({
      where: { phone: input.phone },
      order: { createdAt: 'DESC' },
    });

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

    const matches = await compare(input.code, challenge.codeHash);
    if (!matches) {
      challenge.attempts += 1;
      if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
        await this.challenges.delete({ id: challenge.id });
      } else {
        await this.challenges.save(challenge);
      }
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    await this.challenges.delete({ id: challenge.id });
    const user = await this.users.findOrCreateByPhone(input.phone);
    return {
      accessToken: await this.sign(user),
      user,
    };
  }

  private sign(user: UserResponse): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, email: user.email });
  }
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
