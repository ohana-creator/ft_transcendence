import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // ── Global pipes & interceptors ────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // ── Swagger ────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Auth Service API')
    .setDescription('ft_transcendence Authentication & Authorization API')
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
    .build();

  const swagger = SwaggerModule.createDocument(
    app as NestFastifyApplication,
    config,
  );

  SwaggerModule.setup('docs', app as NestFastifyApplication, swagger, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
