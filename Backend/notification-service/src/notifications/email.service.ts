import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Email service for sending transactional emails via SMTP
 * Configured through environment variables
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on environment config
   * Supports multiple SMTP configurations (Gmail, AWS SES, custom SMTP, etc.)
   */
  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASSWORD');
    const smtpFrom = this.configService.get<string>(
      'SMTP_FROM',
      'noreply@ft-transcendence.com',
    );

    // Skip initialization if SMTP not configured
    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(
        'Email service not fully configured — emails will not be sent',
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // Use TLS for port 465
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      this.logger.log(
        `Email service initialized with SMTP host: ${smtpHost}:${smtpPort}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize email transporter', error);
    }
  }

  /**
   * Send 2FA code email
   */
  async send2FACode(
    to: string,
    username: string,
    code: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not sent (transporter not configured) to ${to}`,
      );
      return false;
    }

    try {
      const mailOptions = {
        from: this.configService.get<string>(
          'SMTP_FROM',
          'noreply@ft-transcendence.com',
        ),
        to,
        subject: 'Your 2FA Code',
        html: this.generate2FAEmailHTML(username, code),
        text: `Your 2FA code is: ${code}\n\nThis code expires in 10 minutes.`,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`2FA code email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send 2FA code email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send 2FA setup confirmation email
   */
  async send2FASetupCode(
    to: string,
    username: string,
    code: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not sent (transporter not configured) to ${to}`,
      );
      return false;
    }

    try {
      const mailOptions = {
        from: this.configService.get<string>(
          'SMTP_FROM',
          'noreply@ft-transcendence.com',
        ),
        to,
        subject: '2FA Setup Confirmation',
        html: this.generate2FASetupEmailHTML(username, code),
        text: `Enter this code to complete 2FA setup: ${code}\n\nThis code expires in 15 minutes.`,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`2FA setup code email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send 2FA setup email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send 2FA disable confirmation email
   */
  async send2FADisableCode(
    to: string,
    username: string,
    code: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not sent (transporter not configured) to ${to}`,
      );
      return false;
    }

    try {
      const mailOptions = {
        from: this.configService.get<string>(
          'SMTP_FROM',
          'noreply@ft-transcendence.com',
        ),
        to,
        subject: '2FA Disable Confirmation',
        html: this.generate2FADisableEmailHTML(username, code),
        text: `Enter this code to disable 2FA: ${code}\n\nThis code expires in 10 minutes.`,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`2FA disable code email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send 2FA disable email to ${to}:`, error);
      return false;
    }
  }

  // ── Email Template Generators ──────────────────────────

  private generate2FAEmailHTML(username: string, code: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <h2>2FA Code Required</h2>
          <p>Hi ${username},</p>
          <p>You've requested a 2-factor authentication code to log in to your account.</p>
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="font-size: 14px; margin: 0;">Enter this code:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 10px 0;">${code}</p>
          </div>
          <p style="color: #666; font-size: 12px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
        </body>
      </html>
    `;
  }

  private generate2FASetupEmailHTML(username: string, code: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <h2>2FA Setup Confirmation</h2>
          <p>Hi ${username},</p>
          <p>You're setting up 2-factor authentication for your account.</p>
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="font-size: 14px; margin: 0;">Confirmation code:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 10px 0;">${code}</p>
          </div>
          <p style="color: #666; font-size: 12px;">This code expires in 15 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, you can ignore this email.</p>
        </body>
      </html>
    `;
  }

  private generate2FADisableEmailHTML(username: string, code: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <h2>2FA Disable Confirmation</h2>
          <p>Hi ${username},</p>
          <p>You've requested to disable 2-factor authentication on your account.</p>
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="font-size: 14px; margin: 0;">Confirmation code:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 10px 0;">${code}</p>
          </div>
          <p style="color: #666; font-size: 12px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, your 2FA remains active.</p>
        </body>
      </html>
    `;
  }
}
