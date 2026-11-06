import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';
import { normalizePhone } from '../utils/normalize-phone.js';
import { IsE164NgPhoneConstraint } from './send-otp.dto.js';

export class VerifyOtpDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? (normalizePhone(value) ?? value.trim()) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(20)
  @Validate(IsE164NgPhoneConstraint)
  phone: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}
