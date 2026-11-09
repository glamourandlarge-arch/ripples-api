import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidateIf,
} from 'class-validator';
import { IsE164PhoneConstraint } from '../utils/is-e164-phone.constraint.js';
import { normalizeE164 } from '../utils/normalize-e164.js';

export class VerifyContactOtpDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @ValidateIf((input: VerifyContactOtpDto) => !input.phone)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return typeof value === 'string'
      ? (normalizeE164(value) ?? value.trim())
      : value;
  })
  @ValidateIf((input: VerifyContactOtpDto) => !input.email)
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  @Validate(IsE164PhoneConstraint)
  phone?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}
