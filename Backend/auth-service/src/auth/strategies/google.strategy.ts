import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const logger = new Logger(GoogleStrategy.name);
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || '';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || '';
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || '';

    const oauthConfigured = !!(clientID && clientSecret && callbackURL);
    if (!oauthConfigured) {
      logger.warn(
        'Google OAuth is not fully configured (GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL). Strategy loaded in disabled mode.',
      );
    }

    super({
      clientID: clientID || '__disabled__',
      clientSecret: clientSecret || '__disabled__',
      callbackURL: callbackURL || 'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const user = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value || '',
      displayName: profile.displayName || '',
    };
    done(null, user);
  }
}
