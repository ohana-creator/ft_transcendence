import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

async function bootstrap() {
  const tlsCertPath = process.env.TLS_CERT_PATH;
  const tlsKeyPath = process.env.TLS_KEY_PATH;
  const httpsRequired = process.env.HTTPS_REQUIRED === 'true';

  let adapter: FastifyAdapter;
  if (tlsCertPath && tlsKeyPath) {
    if (!existsSync(tlsCertPath) || !existsSync(tlsKeyPath)) {
      throw new Error('TLS certificate files were not found. Check TLS_CERT_PATH and TLS_KEY_PATH.');
    }
    adapter = new FastifyAdapter({
      https: {
        cert: readFileSync(tlsCertPath),
        key: readFileSync(tlsKeyPath),
      },
    });
  } else {
    if (httpsRequired) {
      throw new Error('HTTPS is required but TLS_CERT_PATH/TLS_KEY_PATH are not configured.');
    }
    adapter = new FastifyAdapter();
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { cors: true },
  );

  const uploadsDir = process.env.CAMPAIGN_UPLOADS_DIR ?? 'uploads';
  const staticRoot = uploadsDir.startsWith('/')
    ? uploadsDir
    : join(process.cwd(), uploadsDir);

  await app.register(fastifyMultipart as any, { limits: { fileSize: 5 * 1024 * 1024 } });
  
  await app.register(fastifyStatic as any, {
    root: staticRoot,
    prefix: '/uploads/',
    cacheControl: true,
    maxAge: 31536000000,
    immutable: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('Campaign Service API')
    .setDescription('ft_transcendence Campaigns API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter your JWT token' },
      'bearer',
    )
    .addTag('Campaigns')
    .build();

  const swagger = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, swagger, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3002;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
