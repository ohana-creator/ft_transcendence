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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TwoFACodeDto } from './dto/two-fa-code.dto';
import { TwoFAValidateDto } from './dto/two-fa-validate.dto';
import { JwtGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts — try again later' })
  @ApiBody({ type: LoginDto })
  async login(@Body() data: LoginDto) {
    return this.authService.login(data);
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
  @ApiOperation({ summary: 'Complete login by validating 2FA code' })
  @ApiResponse({ status: 200, description: 'Login completed with 2FA' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code or expired token' })
  @ApiBody({ type: TwoFAValidateDto })
  async validate2FA(@Body() body: TwoFAValidateDto) {
    return this.authService.validate2FALogin(body.tempToken, body.code);
  }

  // ── Google OAuth ───────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login (redirects to Google)' })
  async googleLogin() {
    // Passport handles the redirect to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback — exchanges code for token' })
  async googleCallback(@Req() req: any, @Res() reply) {
    const { token } = await this.authService.handleGoogleUser(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return reply.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
}