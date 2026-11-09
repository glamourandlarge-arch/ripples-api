import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import type { UserResponse } from '../services/users.service.js';
import { Public } from '../utils/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';
import { ChangePasswordDto } from './change-password.dto.js';
import { SendContactOtpDto } from './send-contact-otp.dto.js';
import { SendOtpDto } from './send-otp.dto.js';
import { VerifyContactOtpDto } from './verify-contact-otp.dto.js';
import { VerifyOtpDto } from './verify-otp.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() input: RegisterDto) {
    const data = await this.auth.register(input);
    return { message: 'Account created successfully', data };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() input: LoginDto) {
    const data = await this.auth.login(input);
    return { message: 'Login successful', data };
  }

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() input: SendOtpDto) {
    const data = await this.auth.sendOtp(input);
    return { message: 'Verification code sent successfully', data };
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() input: VerifyOtpDto) {
    const data = await this.auth.verifyOtp(input);
    return { message: 'Phone verified successfully', data };
  }

  @Post('contact/otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  async sendContactOtp(
    @CurrentUser() user: UserResponse,
    @Body() input: SendContactOtpDto,
  ) {
    const data = await this.auth.sendContactOtp(user, input);
    return { message: 'Verification code sent successfully', data };
  }

  @Post('contact/otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  async verifyContactOtp(
    @CurrentUser() user: UserResponse,
    @Body() input: VerifyContactOtpDto,
  ) {
    const data = await this.auth.verifyContactOtp(user, input);
    const channel = input.email ? 'Email' : 'Phone';
    return { message: `${channel} verified successfully`, data };
  }

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  async changePassword(
    @CurrentUser() user: UserResponse,
    @Body() input: ChangePasswordDto,
  ) {
    const data = await this.auth.changePassword(user, input);
    return { message: 'Password updated successfully', data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  logout(@Req() request: Request) {
    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    if (!accessToken) {
      throw new UnauthorizedException();
    }

    return this.auth.logout(accessToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  logoutAll(@CurrentUser() user: UserResponse, @Req() request: Request) {
    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    if (!accessToken) {
      throw new UnauthorizedException();
    }

    return this.auth.logoutAll(user, accessToken);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  me(@CurrentUser() user: UserResponse) {
    return { message: 'Current user fetched successfully', data: user };
  }
}
