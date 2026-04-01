import {
  Post,
  Get,
  Controller,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TwoFACodeDto } from './dto/two-fa-code.dto';
import { TwoFAValidateDto } from './dto/two-fa-validate.dto';
import {
  Request2FAEmailDto,
  Validate2FAEmailDto,
  Enable2FAEmailDto,
} from './dto/two-fa-email.dto';
import { JwtGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { SecretsService } from '../config/secrets.service';
import * as crypto from 'crypto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
  ) {}

  // ── Register ───────────────────────────────────────────

  @Post('register')
  @ApiOperation({ summary: 'Register a new local user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  // ── Login ──────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Login with email/username and password' })
  @ApiResponse({ status: 200, description: 'Login successful or 2FA required' })
  @ApiResponse({
    status: 400,
    description: 'Missing identifier/email or password',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({
    status: 429,
    description: 'Too many attempts — try again later',
  })
  @ApiBody({ type: LoginDto })
  async login(
    @Body()
    data: {
      identifier?: string;
      email?: string;
      password?: string;
    },
  ) {
    const identifier = data.identifier ?? data.email;
    const password = data.password;

    if (!identifier || !password) {
      throw new BadRequestException(
        'identifier/email and password are required',
      );
    }

    return this.authService.login({ identifier, password });
  }

  // ── Logout ─────────────────────────────────────────────

  @Post('logout')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate current token' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(@Req() req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await this.authService.logout(token);
    }
  }

  // ── Me ─────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: { userId: string }) {
    return this.authService.getMe(user.userId);
  }

  // ── 2FA: Setup ─────────────────────────────────────────

  @Post('2fa/setup')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup 2FA — returns QR code to scan' })
  @ApiResponse({ status: 200, description: 'QR code and secret returned' })
  async setup2FA(@CurrentUser() user: { userId: string }) {
    return this.authService.setup2FA(user.userId);
  }

  // ── 2FA: Verify & Enable ───────────────────────────────

  @Post('2fa/verify')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify TOTP code and enable 2FA' })
  @ApiResponse({ status: 200, description: '2FA enabled' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  @ApiBody({ type: TwoFACodeDto })
  async verify2FA(
    @CurrentUser() user: { userId: string },
    @Body() body: TwoFACodeDto,
  ) {
    return this.authService.verify2FA(user.userId, body.code);
  }

  // ── 2FA: Disable ───────────────────────────────────────

  @Post('2fa/disable')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA (requires valid TOTP code)' })
  @ApiResponse({ status: 200, description: '2FA disabled' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  @ApiBody({ type: TwoFACodeDto })
  async disable2FA(
    @CurrentUser() user: { userId: string },
    @Body() body: TwoFACodeDto,
  ) {
    return this.authService.disable2FA(user.userId, body.code);
  }

  // ── 2FA: Validate during login ─────────────────────────

  @Post('2fa/validate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Complete login by validating 2FA code' })
  @ApiResponse({ status: 200, description: 'Login completed with 2FA' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code or expired token' })
  @ApiResponse({ status: 429, description: 'Too many attempts — try again later' })
  @ApiBody({ type: TwoFAValidateDto })
  async validate2FA(@Body() body: TwoFAValidateDto) {
    return this.authService.validate2FALogin(body.tempToken, body.code);
  }

  // ── Google OAuth ───────────────────────────────────────

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login (redirects to Google)' })
  async googleLogin(@Res({ passthrough: true }) reply) {
    const googleConfig = this.secretsService.getGoogleConfig();

    if (!googleConfig.clientId || !googleConfig.callbackURL) {
      return reply.status(403).send({
        statusCode: 403,
        message: 'Google OAuth not configured',
      });
    }

    // Generate a random state parameter for CSRF protection
    const state = crypto.randomUUID();

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', googleConfig.clientId);
    authUrl.searchParams.append('redirect_uri', googleConfig.callbackURL);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'email profile');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('state', state);

    return reply.code(307).redirect(authUrl.toString());
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback — exchanges code for token' })
  async googleCallback(@Req() req: any, @Res({ passthrough: true }) reply) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    
    try {
      const { code, state, error } = req.query;
      const authCode = Array.isArray(code) ? code[0] : code;
      
      if (error) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=${error}`);
      }

      if (!authCode || typeof authCode !== 'string') {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=no_code`);
      }

      // Manual Google token exchange
      const googleConfig = this.secretsService.getGoogleConfig();
      if (!googleConfig.clientId || !googleConfig.clientSecret || !googleConfig.callbackURL) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=oauth_config`);
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: authCode,
          client_id: googleConfig.clientId,
          client_secret: googleConfig.clientSecret,
          redirect_uri: googleConfig.callbackURL,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=token_exchange`);
      }

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=no_token`);
      }

      // Get user profile from Google
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileResponse.ok) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=profile_fetch`);
      }

      const profile = await profileResponse.json();

      // Process the user
      const { token } = await this.authService.handleGoogleUser({
        googleId: profile.id,
        email: profile.email,
        displayName: profile.name,
      });

      return reply.code(302).redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (err) {
      return reply.code(302).redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
    }
  }

  // ── 42 OAuth ───────────────────────────────────────────

  @Get('42')
  @ApiOperation({ summary: 'Initiate 42 OAuth login (redirects to 42)' })
  async fortyTwoLogin(@Res({ passthrough: true }) reply) {
    const fortyTwoConfig = this.secretsService.getFortyTwoConfig();

    if (!fortyTwoConfig.clientId || !fortyTwoConfig.callbackURL) {
      return reply.status(403).send({
        statusCode: 403,
        message: '42 OAuth not configured',
      });
    }

    const state = crypto.randomUUID();

    const authUrl = new URL('https://api.intra.42.fr/oauth/authorize');
    authUrl.searchParams.append('client_id', fortyTwoConfig.clientId);
    authUrl.searchParams.append('redirect_uri', fortyTwoConfig.callbackURL);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'public');
    authUrl.searchParams.append('state', state);

    return reply.code(307).redirect(authUrl.toString());
  }

  @Get('42/callback')
  @ApiOperation({ summary: '42 OAuth callback — exchanges code for token' })
  async fortyTwoCallback(@Req() req: any, @Res({ passthrough: true }) reply) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    
    try {
      const fortyTwoConfig = this.secretsService.getFortyTwoConfig();

      if (!fortyTwoConfig.clientId || !fortyTwoConfig.clientSecret || !fortyTwoConfig.callbackURL) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=oauth_config`);
      }

      const code = req.query?.code;
      if (!code || typeof code !== 'string') {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=no_code`);
      }

      const tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: fortyTwoConfig.clientId,
        client_secret: fortyTwoConfig.clientSecret,
        code,
        redirect_uri: fortyTwoConfig.callbackURL,
      });

      const tokenResp = await fetch('https://api.intra.42.fr/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody,
      });

      if (!tokenResp.ok) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=token_exchange`);
      }

      const tokenData = (await tokenResp.json()) as { access_token?: string };
      if (!tokenData.access_token) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=no_token`);
      }

      const meResp = await fetch('https://api.intra.42.fr/v2/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!meResp.ok) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=profile_fetch`);
      }

      const me = (await meResp.json()) as {
        email?: string;
        displayname?: string;
        login?: string;
        id?: number;
      };

      const email = me.email || '';
      const displayName = me.displayname || me.login || 'forty_two_user';

      const { token } = await this.authService.handleFortyTwoUser({
        email,
        displayName,
      });

      return reply.code(302).redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (err) {
      return reply.code(302).redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
    }
  }

  // ── Facebook OAuth ─────────────────────────────────────

  @Get('facebook')
  @ApiOperation({ summary: 'Initiate Facebook OAuth login (redirects to Facebook)' })
  async facebookLogin(@Res({ passthrough: true }) reply) {
    const facebookConfig = this.secretsService.getFacebookConfig();

    if (!facebookConfig.clientId || !facebookConfig.callbackURL) {
      return reply.status(403).send({
        statusCode: 403,
        message: 'Facebook OAuth not configured',
      });
    }

    const state = crypto.randomUUID();

    const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    authUrl.searchParams.append('client_id', facebookConfig.clientId);
    authUrl.searchParams.append('redirect_uri', facebookConfig.callbackURL);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'email,public_profile');
    authUrl.searchParams.append('state', state);

    return reply.code(307).redirect(authUrl.toString());
  }

  @Get('facebook/callback')
  @ApiOperation({ summary: 'Facebook OAuth callback — exchanges code for token' })
  async facebookCallback(@Req() req: any, @Res({ passthrough: true }) reply) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    
    try {
      const facebookConfig = this.secretsService.getFacebookConfig();

      if (!facebookConfig.clientId || !facebookConfig.clientSecret || !facebookConfig.callbackURL) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=oauth_config`);
      }

      const code = req.query?.code;
      if (!code || typeof code !== 'string') {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=no_code`);
      }

      const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
      tokenUrl.searchParams.append('client_id', facebookConfig.clientId);
      tokenUrl.searchParams.append('client_secret', facebookConfig.clientSecret);
      tokenUrl.searchParams.append('redirect_uri', facebookConfig.callbackURL);
      tokenUrl.searchParams.append('code', code);

      const tokenResp = await fetch(tokenUrl.toString());
      if (!tokenResp.ok) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=token_exchange`);
      }

      const tokenData = (await tokenResp.json()) as { access_token?: string };
      if (!tokenData.access_token) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=no_token`);
      }

      const meUrl = new URL('https://graph.facebook.com/me');
      meUrl.searchParams.append('fields', 'id,name,email');
      meUrl.searchParams.append('access_token', tokenData.access_token);

      const meResp = await fetch(meUrl.toString());
      if (!meResp.ok) {
        return reply.code(302).redirect(`${frontendUrl}/auth/login?error=profile_fetch`);
      }

      const me = (await meResp.json()) as {
        email?: string;
        name?: string;
        id?: string;
      };

      const email = me.email || '';
      const displayName = me.name || 'facebook_user';

      const { token } = await this.authService.handleFacebookUser({
        email,
        displayName,
      });

      return reply.code(302).redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (err) {
      return reply.code(302).redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
    }
  }

  // ── 2FA Email: Request Code (No Auth) ─────────────────

  @Post('2fa/email/request')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({
    summary: 'Request 2FA email code during login (after email+password)',
  })
  @ApiResponse({ status: 200, description: 'Code sent to email' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiBody({ type: Request2FAEmailDto })
  async request2FAEmail(@Body() body: Request2FAEmailDto) {
    const identifier = body.email ?? body.identifier;
    if (!identifier) {
      throw new BadRequestException('email or identifier is required');
    }
    return this.authService.request2FAEmail(identifier);
  }

  // ── 2FA Email: Validate during Login ──────────────────

  @Post('2fa/email/validate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Validate 2FA email code to complete login' })
  @ApiResponse({ status: 200, description: 'Login completed with 2FA' })
  @ApiResponse({ status: 401, description: 'Invalid code or expired token' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  @ApiBody({ type: Validate2FAEmailDto })
  async validate2FAEmail(@Body() body: Validate2FAEmailDto) {
    return this.authService.validate2FAEmailLogin(body.tempToken, body.code);
  }

  // ── 2FA Email: Enable (Authenticated User) ───────────

  @Post('2fa/email/enable')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enable 2FA via email for current user account',
  })
  @ApiResponse({
    status: 200,
    description: 'Confirmation code sent to email',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async enable2FAEmail(@CurrentUser() user: { userId: string }) {
    return this.authService.enable2FAEmail(user.userId);
  }

  // ── 2FA Email: Confirm Enable ────────────────────────

  @Post('2fa/email/confirm')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm 2FA email setup with received code' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: Enable2FAEmailDto })
  async confirm2FAEmail(
    @CurrentUser() user: { userId: string },
    @Body() body: Enable2FAEmailDto,
  ) {
    return this.authService.confirm2FAEmail(user.userId, body.code);
  }

  // ── 2FA Email: Disable (Authenticated User) ──────────

  @Post('2fa/email/disable')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Disable 2FA email (requires code confirmation)' })
  @ApiResponse({ status: 200, description: '2FA disabled or code sent' })
  @ApiResponse({ status: 401, description: 'Invalid code or unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiBody({ type: Enable2FAEmailDto, required: false })
  async disable2FAEmail(
    @CurrentUser() user: { userId: string },
    @Body() body?: Enable2FAEmailDto,
  ) {
    return this.authService.disable2FAEmail(user.userId, body?.code || '');
  }
}