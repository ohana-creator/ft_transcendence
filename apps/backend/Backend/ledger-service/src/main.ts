import 'dotenv/config';
import { NestFactory }    from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule }      from './app.module.js';
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
      logger: true,
    });
  } else {
    if (httpsRequired) {
      throw new Error('HTTPS is required but TLS_CERT_PATH/TLS_KEY_PATH are not configured.');
    }
    adapter = new FastifyAdapter({ logger: true });
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule, adapter,
  );

  //app.setGlobalPrefix('api', { exclude: ['health'] });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
  }));

  const config = new DocumentBuilder()
    .setTitle('Ledger Service — VAKS Token')
    .setDescription('On-chain VAKS token operations via Avalanche Fuji Testnet')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, swaggerDoc);

  await app.listen(process.env.PORT ?? 3006, '0.0.0.0');
}
bootstrap();