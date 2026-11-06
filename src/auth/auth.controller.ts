import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { UserResponse } from '../services/users.service.js';
import { Public } from '../utils/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';
import { SendOtpDto } from './send-otp.dto.js';
import { VerifyOtpDto } from './verify-otp.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() input: RegisterDto) {
    return this.auth.register(input);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() input: LoginDto) {
    return this.auth.login(input);
  }

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() input: SendOtpDto) {
    return this.auth.sendOtp(input);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() input: VerifyOtpDto) {
    return this.auth.verifyOtp(input);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  me(@CurrentUser() user: UserResponse) {
    return user;
  }
}
