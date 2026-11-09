import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService, type UserResponse } from '../services/users.service.js';
import { AccessTokenRevocationService } from './access-token-revocation.service.js';
import type { JwtPayload } from './jwt-payload.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
    private readonly revokedAccessTokens: AccessTokenRevocationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UserResponse> {
    if (
      !payload.jti ||
      (await this.revokedAccessTokens.isRevoked(payload.jti))
    ) {
      throw new UnauthorizedException();
    }

    try {
      const user = await this.users.findOne(payload.sub);
      if ((payload.sv ?? 0) !== user.sessionVersion) {
        throw new UnauthorizedException();
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException();
      }
      throw error;
    }
  }
}
