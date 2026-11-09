import {
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { isE164Phone } from './normalize-e164.js';

@ValidatorConstraint({ name: 'isE164Phone', async: false })
export class IsE164PhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isE164Phone(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid international phone number`;
  }
}
