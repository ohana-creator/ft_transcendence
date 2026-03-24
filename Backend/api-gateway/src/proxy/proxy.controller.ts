import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiTags, ApiExcludeController } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

// ── Auth Service ────────────────────────────────────────────
// Rotas públicas e protegidas — o auth-service gere os seus
// próprios guards (login, register, OAuth, 2FA, etc.)

@ApiTags('Auth (proxy)')
@ApiExcludeController()
@Controller('auth')
export class AuthProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @All()
  root(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('auth', req, reply);
  }

  @All('*')
  nested(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('auth', req, reply);
  }
}

// ── User Service ────────────────────────────────────────────
// GET /users/search e GET /users/:id são públicos;
// PUT e avatar endpoints requerem JWT (validado pelo user-service).

@ApiTags('Users (proxy)')
@ApiExcludeController()
@Controller('users')
export class UsersProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @All()
  root(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('users', req, reply);
  }

  @All('*')
  nested(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('users', req, reply);
  }
}

// ── Wallet Service ──────────────────────────────────────────
// Todos os endpoints públicos exigem JWT (validado pelo wallet-service).

@ApiTags('Wallet (proxy)')
@ApiExcludeController()
@Controller('wallet')
export class WalletProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @All()
  root(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('wallet', req, reply);
  }

  @All('*')
  nested(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('wallet', req, reply);
  }
}

// ── Campaign Service ────────────────────────────────────────
// CRUD de campanhas, membros, contribuições, convites.
// Todos os endpoints exigem JWT (validado pelo campaign-service).

@ApiTags('Campaigns (proxy)')
@ApiExcludeController()
@Controller('campaigns')
export class CampaignsProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @All()
  root(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('campaigns', req, reply);
  }

  @All('*')
  nested(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('campaigns', req, reply);
  }
}

// ── Invitations (Campaign Service) ──────────────────────────
// Aceitar/rejeitar convites — rota separada mas servida pelo campaign-service.

@ApiTags('Invitations (proxy)')
@ApiExcludeController()
@Controller('invitations')
export class InvitationsProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @All()
  root(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('invitations', req, reply);
  }

  @All('*')
  nested(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('invitations', req, reply);
  }
}

// ── Notification Service ────────────────────────────────────
// Notificações in-app, histórico, leitura.
// Todos os endpoints exigem JWT (validado pelo notification-service).

@ApiTags('Notifications (proxy)')
@ApiExcludeController()
@Controller('notifications')
export class NotificationsProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @All()
  root(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('notifications', req, reply);
  }

  @All('*')
  nested(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('notifications', req, reply);
  }
}

// ── Ledger Service ──────────────────────────────────────────
// Operações on-chain (wallet mapping, mint, transfer, balance, histórico).

@ApiTags('Ledger (proxy)')
@ApiExcludeController()
@Controller('ledger')
export class LedgerProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @All()
  root(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('ledger', req, reply);
  }

  @All('*')
  nested(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward('ledger', req, reply);
  }
}
