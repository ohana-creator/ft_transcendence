import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const tlsCertPath = process.env.TLS_CERT_PATH;
  const tlsKeyPath = process.env.TLS_KEY_PATH;
  const httpsRequired = process.env.HTTPS_REQUIRED === 'true';

  let adapter: FastifyAdapter;
  if (tlsCertPath && tlsKeyPath) {
    if (!existsSync(tlsCertPath) || !existsSync(tlsKeyPath)) {
      throw new Error(
        'TLS certificate files were not found. Check TLS_CERT_PATH and TLS_KEY_PATH.',
      );
    }

    adapter = new FastifyAdapter({
      https: {
        cert: readFileSync(tlsCertPath),
        key: readFileSync(tlsKeyPath),
      },
      logger: true,
    });
  } else {
    if (httpsRequired) {
      throw new Error(
        'HTTPS is required but TLS_CERT_PATH/TLS_KEY_PATH are not configured.',
      );
    }

    adapter = new FastifyAdapter({ logger: true });
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  const normalizeOrigin = (value: string): string => value.replace(/\/$/, '').trim();

  const configuredOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  const devOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://ft-transcendence-7a9e.onrender.com/'
  ];

  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? configuredOrigins
      : Array.from(new Set([...configuredOrigins, ...devOrigins]));

  app.enableCors({
  origin: (origin, callback) => {
    console.log('====================');
    console.log('Origin:', origin);
    console.log('Allowed:', allowedOrigins);
    console.log('====================');

    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (!allowedOrigins.length || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'), false);
  },
});

  await app.register(fastifyMultipart as any, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  const uploadsDir = process.env.CAMPAIGN_UPLOADS_DIR ?? 'uploads';
  const staticRoot = uploadsDir.startsWith('/')
    ? uploadsDir
    : join(process.cwd(), uploadsDir);

  await app.register(fastifyStatic as any, {
    root: staticRoot,
    prefix: '/uploads/',
    cacheControl: true,
    maxAge: 31536000000,
    immutable: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const config = new DocumentBuilder()
    .setTitle('Monolito API')
    .setDescription('Backend unificado com Auth, Users, Campaigns, Notifications e Wallet')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
      'bearer',
    )
    .addTag('Auth')
    .addTag('Users')
    .addTag('Social')
    .addTag('Campaigns')
    .addTag('Upload')
    .addTag('Notifications')
    .addTag('Wallet')
    .addTag('Transactions')
    .build();

  const swagger = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, swagger, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
