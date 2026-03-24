import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest, FastifyReply } from 'fastify';

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
    const requestUrl = new URL(req.url, 'http://gateway.local');
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

    this.logger.log(`→ ${req.method} ${req.url} ⇒ ${targetUrl}`);

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

    // Preparar body (se existir)
    let body: Buffer | string | undefined;

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
      if (Buffer.isBuffer(req.body)) {
        body = req.body;
      } else if (typeof req.body === 'object') {
        body = JSON.stringify(req.body);
        headers['content-type'] = 'application/json';
      } else if (typeof req.body === 'string') {
        body = req.body;
      }
    }

    try {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
      } as RequestInit);

      // Copiar status code
      reply.status(response.status);

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
    } catch (error: any) {
      this.logger.error(`Proxy error → ${req.method} ${targetUrl}: ${error.message}`);
      reply.status(502).send({
        statusCode: 502,
        message: 'Service unavailable',
      });
    }
  }
}
