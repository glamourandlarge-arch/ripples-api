import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { AccessTokenRevocationService } from './access-token-revocation.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';
import { OtpChallenge } from './otp-challenge.entity.js';
import { OtpRateLimiterService } from './otp-rate-limiter.service.js';
import { RevokedAccessToken } from './revoked-access-token.entity.js';
import { ConsoleEmailSender, EMAIL_SENDER } from './email-sender.js';
import { ConsoleSmsSender, SMS_SENDER } from './sms-sender.js';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([OtpChallenge, RevokedAccessToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN') as NonNullable<
            JwtSignOptions['expiresIn']
          >,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenRevocationService,
    OtpRateLimiterService,
    JwtStrategy,
    {
      provide: SMS_SENDER,
      useClass: ConsoleSmsSender,
    },
    {
      provide: EMAIL_SENDER,
      useClass: ConsoleEmailSender,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
