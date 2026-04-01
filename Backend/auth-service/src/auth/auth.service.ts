import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────

  private generateToken(user: { id: string; email: string; username: string }) {
    const jti = crypto.randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      jti,
    };
    const token = this.jwt.sign(payload);
    return { token, jti };
  }

  private generateTempToken(userId: string) {
    return this.jwt.sign(
      { sub: userId, isTwoFA: true, jti: crypto.randomUUID() },
      { expiresIn: '5m' },
    );
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    username: string;
    authProvider: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      authProvider: user.authProvider,
    };
  }

  // ── Register ─────────────────────────────────────────────

  async register(data: RegisterDto) {
    const { email, username, password } = data;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          username,
          hashedPassword,
          authProvider: 'LOCAL',
        },
      });

      const { token } = this.generateToken(user);

      // Publish event for other microservices via Redis Stream
      await this.redis.publish('auth-events', 'user.created', {
        id: user.id,
        email: user.email,
        username: user.username,
        authProvider: user.authProvider,
      });

      this.logger.log(`User registered: ${user.email}`);

      return {
        success: true,
        data: {
          user: this.sanitizeUser(user),
          accessToken: token,
        },
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or username already exists');
      }
      throw error;
    }
  }

  // ── Login ────────────────────────────────────────────────

  async login(data: LoginDto) {
    const { identifier, password } = data;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user || !user.hashedPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // If 2FA is enabled, return temporary token
    if (user.twoFAEnabled) {
      const tempToken = this.generateTempToken(user.id);
      return {
        success: true,
        requiresTwoFA: true,
        tempToken,
      };
    }

    const { token } = this.generateToken(user);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      success: true,
      data: {
        user: this.sanitizeUser(user),
        accessToken: token,
      },
    };
  }

  // ── Logout (blacklist the token) ─────────────────────────

  async logout(rawToken: string) {
    try {
      const decoded = this.jwt.decode(rawToken) as {
        jti?: string;
        exp?: number;
      } | null;

      if (decoded?.jti && decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redis.blacklistToken(decoded.jti, ttl);
          this.logger.log(`Token blacklisted (jti: ${decoded.jti})`);
        }
      }
    } catch {
      // Token might be malformed — logout is best-effort
    }
  }

  // ── Get Me ───────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        twoFAEnabled: true,
        authProvider: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { success: true, data: user };
  }

  // ── 2FA: Setup ───────────────────────────────────────────

  async setup2FA(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new UnauthorizedException('User not found');
    if (user.twoFAEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = otplib.generateSecret();

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFASecret: secret },
    });

    const otpauthUrl = otplib.generateURI({
      issuer: 'ft_transcendence',
      label: user.email,
      secret,
    });
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return { success: true, data: { secret, qrCodeUrl } };
  }

  // ── 2FA: Verify & Enable ────────────────────────────────

  async verify2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFASecret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    const verification = await otplib.verify({
      token: code,
      secret: user.twoFASecret,
    });
    const isValid = verification.valid;

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFAEnabled: true },
    });

    this.logger.log(`2FA enabled for user ${userId}`);

    return { success: true, message: '2FA enabled successfully' };
  }

  // ── 2FA: Disable ────────────────────────────────────────

  async disable2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFASecret || !user.twoFAEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const verification = await otplib.verify({
      token: code,
      secret: user.twoFASecret,
    });
    const isValid = verification.valid;

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFAEnabled: false, twoFASecret: null },
    });

    this.logger.log(`2FA disabled for user ${userId}`);

    return { success: true, message: '2FA disabled successfully' };
  }

  // ── 2FA: Validate during login ──────────────────────────

  async validate2FALogin(tempToken: string, code: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(tempToken);
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired temporary token',
      );
    }

    if (!payload.isTwoFA) {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.twoFASecret) {
      throw new UnauthorizedException(
        'User not found or 2FA not configured',
      );
    }

    const verification = await otplib.verify({
      token: code,
      secret: user.twoFASecret,
    });
    const isValid = verification.valid;

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Blacklist the temp token so it cannot be replayed
    if (payload.jti && payload.exp) {
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.blacklistToken(payload.jti, ttl);
      }
    }

    const { token } = this.generateToken(user);

    this.logger.log(`2FA login completed for user ${user.email}`);

    return {
      success: true,
      data: {
        user: this.sanitizeUser(user),
        accessToken: token,
      },
    };
  }

  // ── Google OAuth ─────────────────────────────────────────

  async handleGoogleUser(profile: {
    googleId: string;
    email: string;
    displayName: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    let isNewUser = false;

    if (!user) {
      // Check if user with this email already exists (registered locally)
      const existingUser = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (existingUser) {
        // Link Google account to existing user
        user = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { googleId: profile.googleId },
        });
      } else {
        // Create new user — generate unique username from displayName
        let username = profile.displayName
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .substring(0, 25);

        const existing = await this.prisma.user.findUnique({
          where: { username },
        });
        if (existing) {
          username = `${username}_${Date.now().toString(36)}`;
        }

        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            username,
            googleId: profile.googleId,
            authProvider: 'GOOGLE',
          },
        });
        isNewUser = true;
      }
    }

    if (isNewUser) {
      await this.redis.publish('auth-events', 'user.created', {
        id: user.id,
        email: user.email,
        username: user.username,
        authProvider: user.authProvider,
      });
    }

    const { token } = this.generateToken(user);

    this.logger.log(`Google login: ${user.email} (new=${isNewUser})`);

    return { token, user: this.sanitizeUser(user) };
  }

  // ── OAuth 42 ─────────────────────────────────────────────

  async handleFortyTwoUser(profile: {
    email: string;
    displayName: string;
  }) {
    if (!profile.email) {
      throw new UnauthorizedException('42 account does not provide email');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    let isNewUser = false;

    if (!user) {
      let username = profile.displayName
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .substring(0, 25);

      const existing = await this.prisma.user.findUnique({
        where: { username },
      });
      if (existing) {
        username = `${username}_${Date.now().toString(36)}`;
      }

      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          username,
          authProvider: 'GOOGLE',
        },
      });
      isNewUser = true;
    }

    if (isNewUser) {
      await this.redis.publish('auth-events', 'user.created', {
        id: user.id,
        email: user.email,
        username: user.username,
        authProvider: user.authProvider,
      });
    }

    const { token } = this.generateToken(user);

    this.logger.log(`42 login: ${user.email} (new=${isNewUser})`);

    return { token, user: this.sanitizeUser(user) };
  }

  // ── Facebook OAuth ───────────────────────────────────────

  async handleFacebookUser(profile: {
    email: string;
    displayName: string;
  }) {
    if (!profile.email) {
      throw new UnauthorizedException('Facebook account does not provide email');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    let isNewUser = false;

    if (!user) {
      let username = profile.displayName
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .substring(0, 25);

      const existing = await this.prisma.user.findUnique({
        where: { username },
      });
      if (existing) {
        username = `${username}_${Date.now().toString(36)}`;
      }

      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          username,
          authProvider: 'GOOGLE',
        },
      });
      isNewUser = true;
    }

    if (isNewUser) {
      await this.redis.publish('auth-events', 'user.created', {
        id: user.id,
        email: user.email,
        username: user.username,
        authProvider: user.authProvider,
      });
    }

    const { token } = this.generateToken(user);

    this.logger.log(`Facebook login: ${user.email} (new=${isNewUser})`);

    return { token, user: this.sanitizeUser(user) };
  }

  // ── 2FA Email: Generate & Send Code ─────────────────────

  /**
   * Generates a random 6-digit code and stores it with expiration
   * Then publishes an event for notification-service to send via email
   */
  async request2FAEmail(identifier: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      // Don't reveal if email exists for security
      throw new BadRequestException('Could not process 2FA request');
    }

    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFAEmailCode: code,
        twoFAEmailExpiresAt: expiresAt,
      },
    });

    // Publish event to notification-service to send email
    await this.redis.publish('auth-events', '2fa.email.code-generated', {
      userId: user.id,
      email: user.email,
      username: user.username,
      code,
    });

    this.logger.log(`2FA email code generated for user ${user.id}`);

    return {
      success: true,
      message: 'Code sent to your email',
      // Don't return code to client
    };
  }

  /**
   * Validates 2FA email code during login
   * Called after user provides email + password (requiresTwoFA=true)
   */
  async validate2FAEmailLogin(tempToken: string, code: string) {
    const normalizedToken = tempToken.replace(/^Bearer\s+/i, '').trim();

    let payload: any;
    try {
      payload = this.jwt.verify(normalizedToken);
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired temporary token',
      );
    }

    if (!payload?.sub) {
      throw new UnauthorizedException(
        'Invalid token state for 2FA validation',
      );
    }

    if (!payload?.isTwoFA) {
      this.logger.warn(
        `2FA validation received token without isTwoFA flag for user ${payload.sub}; continuing with subject validation`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.twoFAEmailCode || !user.twoFAEmailExpiresAt) {
      throw new BadRequestException('No 2FA code found for this session');
    }

    // Check expiration
    if (new Date() > user.twoFAEmailExpiresAt) {
      throw new BadRequestException('2FA code expired — request a new one');
    }

    // Check code
    if (user.twoFAEmailCode !== code) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Clear code after successful validation
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFAEmailCode: null,
        twoFAEmailExpiresAt: null,
      },
    });

    const { token } = this.generateToken(user);

    this.logger.log(`2FA email validation successful for user ${user.id}`);

    return {
      success: true,
      data: {
        user: this.sanitizeUser(user),
        accessToken: token,
      },
    };
  }

  /**
   * Enables 2FA via email for authenticated user
   * Generates code, sends email, expects user to confirm with that code
   */
  async enable2FAEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate 6-digit code for confirmation
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEmailCode: code,
        twoFAEmailExpiresAt: expiresAt,
      },
    });

    // Publish event to send email
    await this.redis.publish('auth-events', '2fa.email.setup-code-generated', {
      userId: user.id,
      email: user.email,
      username: user.username,
      code,
    });

    this.logger.log(`2FA email setup code sent to user ${userId}`);

    return {
      success: true,
      message: 'Confirmation code sent to your email',
    };
  }

  /**
   * Confirms 2FA email setup with the code user received
   */
  async confirm2FAEmail(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.twoFAEmailCode || !user.twoFAEmailExpiresAt) {
      throw new BadRequestException('No verification code found — start setup again');
    }

    // Check expiration
    if (new Date() > user.twoFAEmailExpiresAt) {
      throw new BadRequestException('Code expired — request a new one');
    }

    // Check code
    if (user.twoFAEmailCode !== code) {
      throw new UnauthorizedException('Invalid code');
    }

    // Clear temp code and enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnabled: true,
        twoFAEmailCode: null,
        twoFAEmailExpiresAt: null,
      },
    });

    this.logger.log(`2FA email enabled for user ${userId}`);

    return {
      success: true,
      message: '2FA via email enabled successfully',
    };
  }

  /**
   * Disables 2FA via email for authenticated user
   * Requires email code confirmation for security
   */
  async disable2FAEmail(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFAEnabled) {
      throw new BadRequestException('2FA email is not enabled');
    }

    // Generate code for disabling
    const tempCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // First request: send code
    if (!code) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFAEmailCode: tempCode,
          twoFAEmailExpiresAt: expiresAt,
        },
      });

      await this.redis.publish('auth-events', '2fa.email.disable-code-generated', {
        userId: user.id,
        email: user.email,
        username: user.username,
        code: tempCode,
      });

      this.logger.log(`2FA disable code sent to user ${userId}`);

      return {
        success: true,
        message: 'Disable confirmation code sent to your email',
        requiresConfirmation: true,
      };
    }

    // Second request: confirm with code
    if (!user.twoFAEmailCode || !user.twoFAEmailExpiresAt) {
      throw new BadRequestException('No verification code found');
    }

    if (new Date() > user.twoFAEmailExpiresAt) {
      throw new BadRequestException('Code expired — start disable process again');
    }

    if (user.twoFAEmailCode !== code) {
      throw new UnauthorizedException('Invalid code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnabled: false,
        twoFAEmailCode: null,
        twoFAEmailExpiresAt: null,
      },
    });

    this.logger.log(`2FA email disabled for user ${userId}`);

    return {
      success: true,
      message: '2FA email disabled successfully',
    };
  }
}