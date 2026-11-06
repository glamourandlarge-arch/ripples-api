import { IsString, MaxLength, MinLength } from 'class-validator';
import { CreateUserDto } from '../users/create-user.dto.js';

export class RegisterDto extends CreateUserDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
