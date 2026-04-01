import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from 'src/redis/redis.service';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  jti: string;
  isTwoFA?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Reject 2FA temp tokens — they are not full access tokens
    if (payload.isTwoFA) {
      throw new UnauthorizedException('Invalid token type');
    }

    // Reject tokens without jti — required for revocation
    if (!payload.jti) {
      throw new UnauthorizedException('Invalid token');
    }

    // Check Redis blacklist
    const isBlacklisted = await this.redisService.isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  }
}
