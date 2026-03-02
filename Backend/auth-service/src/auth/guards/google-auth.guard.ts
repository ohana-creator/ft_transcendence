import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // For the callback endpoint, Passport will validate the code
    // The Fastify-Passport integration should work here since we're just validating,
    // not doing a redirect
    return (await super.canActivate(context)) as boolean;
  }

  handleRequest(err: any, user: any, info: any, context?: ExecutionContext) {
    if (err || !user) {
      throw err || new Error('Google authentication failed');
    }
    return user;
  }
}
