import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);
  private cache = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Read secret from file or environment variable
   * Priority: 1) File path from env (e.g., GOOGLE_CLIENT_ID_FILE) 
   *          2) Direct env variable (e.g., GOOGLE_CLIENT_ID)
   *          3) Return null
   */
  getSecret(envVarName: string): string | null {
    // Check cache first
    if (this.cache.has(envVarName)) {
      return this.cache.get(envVarName)!;
    }

    let value: string | null = null;

    // Try reading from secret file first
    const fileEnvVar = `${envVarName}_FILE`;
    const filePath = this.configService.get<string>(fileEnvVar);
    
    if (filePath) {
      try {
        if (fs.existsSync(filePath)) {
          value = fs.readFileSync(filePath, 'utf8').trim();
          this.logger.debug(`Read ${envVarName} from secret file: ${filePath}`);
        }
      } catch (error) {
        this.logger.error(`Failed to read secret from ${filePath}:`, error);
      }
    }

    // Fallback to environment variable
    if (!value) {
      value = this.configService.get<string>(envVarName);
      if (value) {
        this.logger.debug(`Read ${envVarName} from environment variable`);
      }
    }

    // Cache the result (even if null)
    this.cache.set(envVarName, value || '');
    
    return value || null;
  }

  /**
   * Get Google OAuth credentials
   */
  getGoogleConfig() {
    return {
      clientId: this.getSecret('GOOGLE_CLIENT_ID'),
      clientSecret: this.getSecret('GOOGLE_CLIENT_SECRET'),
      callbackURL: this.configService.get<string>('GOOGLE_CALLBACK_URL'),
    };
  }

  /**
   * Get 42 OAuth credentials
   */
  getFortyTwoConfig() {
    return {
      clientId: this.getSecret('FORTYTWO_CLIENT_ID'),
      clientSecret: this.getSecret('FORTYTWO_CLIENT_SECRET'),
      callbackURL: this.configService.get<string>('FORTYTWO_CALLBACK_URL'),
    };
  }

  /**
   * Get Facebook OAuth credentials
   */
  getFacebookConfig() {
    return {
      clientId: this.getSecret('FACEBOOK_CLIENT_ID'),
      clientSecret: this.getSecret('FACEBOOK_CLIENT_SECRET'),
      callbackURL: this.configService.get<string>('FACEBOOK_CALLBACK_URL'),
    };
  }
}