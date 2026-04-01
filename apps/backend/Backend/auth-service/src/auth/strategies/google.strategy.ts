import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { SecretsService } from '../../config/secrets.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
  ) {
    const logger = new Logger(GoogleStrategy.name);
    const googleConfig = secretsService.getGoogleConfig();

    const oauthConfigured = !!(googleConfig.clientId && googleConfig.clientSecret && googleConfig.callbackURL);
    if (!oauthConfigured) {
      logger.warn(
        'Google OAuth is not fully configured (GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL). Strategy loaded in disabled mode.',
      );
    }

    super({
      clientID: googleConfig.clientId || '__disabled__',
      clientSecret: googleConfig.clientSecret || '__disabled__',
      callbackURL: googleConfig.callbackURL || 'http://localhost:3000/auth/google/callback',
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
