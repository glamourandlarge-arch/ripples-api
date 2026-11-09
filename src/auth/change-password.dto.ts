import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class ChangePasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value : value))
  @ValidateIf((input: ChangePasswordDto) => input.currentPassword !== undefined)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}
