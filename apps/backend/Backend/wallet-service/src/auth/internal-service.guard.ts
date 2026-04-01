import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard for internal service-to-service endpoints.
 * Validates a shared secret sent in the `x-internal-api-key` header.
 * This prevents external users from calling internal endpoints directly.
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  private readonly logger = new Logger(InternalServiceGuard.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>('INTERNAL_API_KEY');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-internal-api-key'];

    if (!key || key !== this.apiKey) {
      this.logger.warn('Rejected internal request — invalid or missing API key');
      throw new UnauthorizedException('Invalid internal service credentials');
    }

    return true;
  }
}
