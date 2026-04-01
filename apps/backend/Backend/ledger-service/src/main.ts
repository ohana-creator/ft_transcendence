import 'dotenv/config';
import { NestFactory }    from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule }      from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule, new FastifyAdapter({ logger: true }),
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