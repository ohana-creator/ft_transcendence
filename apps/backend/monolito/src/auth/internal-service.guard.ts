import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const expectedApiKey = process.env.INTERNAL_API_KEY;
    const providedApiKey = request.headers['x-internal-api-key'];

    if (!expectedApiKey) {
      throw new UnauthorizedException('Internal API key is not configured');
    }

    if (providedApiKey !== expectedApiKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}