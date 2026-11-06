import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { normalizePhone } from '../utils/normalize-phone.js';

@ValidatorConstraint({ name: 'isE164NgPhone', async: false })
export class IsE164NgPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && normalizePhone(value) !== null;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid Nigerian phone number`;
  }
}

export class SendOtpDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? (normalizePhone(value) ?? value.trim()) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(20)
  @Validate(IsE164NgPhoneConstraint)
  phone: string;
}
