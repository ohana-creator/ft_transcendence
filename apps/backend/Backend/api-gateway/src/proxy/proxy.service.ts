import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';

/**
 * ProxyService — Encaminha pedidos HTTP para os microserviços backend.
 *
 * Utiliza a API nativa `fetch` do Node 20 (undici) para fazer o pedido
 * ao serviço destino e devolver a resposta ao cliente.
 */
@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly routes: Record<string, string>;
  private readonly statusCounters = new Map<string, number>();

  constructor(private readonly config: ConfigService) {
    this.routes = {
      auth: config.getOrThrow<string>('AUTH_SERVICE_URL'),
      users: config.getOrThrow<string>('USER_SERVICE_URL'),
      wallet: config.getOrThrow<string>('WALLET_SERVICE_URL'),
      campaigns: config.getOrThrow<string>('CAMPAIGN_SERVICE_URL'),
      invitations: config.getOrThrow<string>('CAMPAIGN_SERVICE_URL'),
      notifications: config.getOrThrow<string>('NOTIFICATION_SERVICE_URL'),
      ledger: config.getOrThrow<string>('LEDGER_SERVICE_URL'),
    };
  }

  /**
   * Encaminha o pedido HTTP para o microserviço correcto.
   *
   * @param prefix  Chave do serviço destino (ex: 'auth', 'users')
   * @param req     Pedido Fastify original
   * @param reply   Resposta Fastify para enviar ao cliente
   */
  async forward(
    prefix: string,
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const serviceUrl = this.routes[prefix];
    if (!serviceUrl) {
      reply.status(502).send({ statusCode: 502, message: 'Service not configured' });
      return;
    }

    // Construir URL destino: base do serviço + path + query string original
    // Rotas internas do microserviço (health, docs/swagger) vivem sem o
    // prefixo do gateway — é necessário reescrever o path.
    const requestUrl = new URL(req.url, 'https://gateway.local');
    const correlationId = this.getCorrelationId(req);
    const userId = this.extractUserId(req.headers.authorization);
    const startedAt = Date.now();

    if (
      prefix === 'wallet' &&
      (
        requestUrl.pathname === '/wallet/campaign' ||
        requestUrl.pathname.startsWith('/wallet/campaign/') ||
        requestUrl.pathname === '/wallet/internal' ||
        requestUrl.pathname.startsWith('/wallet/internal/')
      )
    ) {
      reply.status(404).send({ statusCode: 404, message: 'Not Found' });
      this.incrementCounter(req.method, requestUrl.pathname, 404);
      return;
    }
    const prefixPattern = `/${prefix}/`;
    const prefixExact = `/${prefix}`;

    let targetPath: string;
    const strippedPath = requestUrl.pathname.startsWith(prefixPattern)
      ? requestUrl.pathname.slice(prefixExact.length)   // "/auth/docs" → "/docs"
      : requestUrl.pathname === prefixExact
        ? '/'                                            // "/auth"     → "/"
        : requestUrl.pathname;

    // Rotas que devem chegar ao microserviço sem o prefixo do gateway:
    // /health, /docs, /docs/*, /docs-json
    const gatewayInternalPaths = ['/health', '/docs', '/docs-json'];
    const isInternalRoute = gatewayInternalPaths.some(
      (p) => strippedPath === p || strippedPath.startsWith(p + '/'),
    );

    targetPath = isInternalRoute ? strippedPath : requestUrl.pathname;
    const targetUrl = `${serviceUrl}${targetPath}${requestUrl.search}`;

    this.logger.log(`[${correlationId}] → ${req.method} ${req.url} ⇒ ${targetUrl} userId=${userId}`);

    // Copiar headers relevantes (excluir hop-by-hop headers)
    const headers: Record<string, string> = {};
    const skipHeaders = new Set(['host', 'connection', 'keep-alive', 'transfer-encoding', 'content-length',
    ]);

    for (const [key, value] of Object.entries(req.headers)) {
      if (skipHeaders.has(key)) continue;
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }

    headers['x-correlation-id'] = correlationId;

    // Preparar body (se existir)
    let body: any;
    const methodAllowsBody = req.method !== 'GET' && req.method !== 'HEAD';
    const contentTypeHeader = req.headers['content-type'];
    const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;
    const isMultipart = typeof contentType === 'string' && contentType.includes('multipart/form-data');

    if (methodAllowsBody) {
      if (req.body !== undefined) {
        if (Buffer.isBuffer(req.body)) {
          body = req.body;
        } else if (typeof req.body === 'object') {
          body = JSON.stringify(req.body);
          headers['content-type'] = 'application/json';
        } else if (typeof req.body === 'string') {
          body = req.body;
        }
      } else if (isMultipart) {
        // Preserve raw multipart stream when the body is not pre-parsed by Fastify.
        body = req.raw;
      }
    }

    try {
      const requestInit: RequestInit & { duplex?: 'half' } = {
        method: req.method,
        headers,
        body,
        redirect: 'manual',
      };

      if (body === req.raw) {
        requestInit.duplex = 'half';
      }

      const response = await fetch(targetUrl, requestInit);

      // Copiar status code
      reply.status(response.status);
      reply.header('x-correlation-id', correlationId);

      // Copiar response headers (excluir hop-by-hop)
      response.headers.forEach((value, key) => {
        if (!skipHeaders.has(key)) {
          reply.header(key, value);
        }
      });

      // Copiar response body
      const responseBody = Buffer.from(await response.arrayBuffer());

      if (responseBody.byteLength > 0) {
        reply.send(responseBody);
      } else {
        reply.send();
      }

      const latencyMs = Date.now() - startedAt;
      this.incrementCounter(req.method, requestUrl.pathname, response.status);
      this.logger.log(
        `[${correlationId}] ← ${req.method} ${requestUrl.pathname} status=${response.status} latency=${latencyMs}ms userId=${userId}`,
      );
    } catch (error: any) {
      this.logger.error(`Proxy error → ${req.method} ${targetUrl}: ${error.message}`);
      const latencyMs = Date.now() - startedAt;
      this.incrementCounter(req.method, requestUrl.pathname, 502);
      reply.status(502).send({
        statusCode: 502,
        message: 'Service unavailable',
      });
      this.logger.error(
        `[${correlationId}] ← ${req.method} ${requestUrl.pathname} status=502 latency=${latencyMs}ms userId=${userId}`,
      );
    }
  }

  getMetrics() {
    return Object.fromEntries(this.statusCounters.entries());
  }

  private incrementCounter(method: string, path: string, statusCode: number) {
    const bucket = `${method.toUpperCase()} ${path} ${Math.floor(statusCode / 100)}xx`;
    this.statusCounters.set(bucket, (this.statusCounters.get(bucket) ?? 0) + 1);
  }

  private getCorrelationId(req: FastifyRequest): string {
    const header = req.headers['x-correlation-id'];
    if (typeof header === 'string' && header.trim()) {
      return header;
    }
    return randomUUID();
  }

  private extractUserId(authorization?: string | string[]): string {
    const tokenHeader = Array.isArray(authorization) ? authorization[0] : authorization;
    if (!tokenHeader?.startsWith('Bearer ')) {
      return 'anonymous';
    }

    const token = tokenHeader.slice(7);
    const parts = token.split('.');
    if (parts.length < 2) {
      return 'anonymous';
    }

    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as { sub?: string };
      return payload.sub ?? 'anonymous';
    } catch {
      return 'anonymous';
    }
  }
}
