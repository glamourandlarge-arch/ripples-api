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
import { IsE164PhoneConstraint } from '../utils/is-e164-phone.constraint.js';
import { normalizeE164 } from '../utils/normalize-e164.js';
import { normalizePhone } from '../utils/normalize-phone.js';

function normalizeAuthPhone(value: string): string {
  return normalizeE164(value) ?? normalizePhone(value) ?? value.trim();
}

export class VerifyOtpDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeAuthPhone(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  @Validate(IsE164PhoneConstraint)
  phone: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}
