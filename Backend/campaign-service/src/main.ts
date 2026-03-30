import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import { join } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
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

  await app.listen(process.env.PORT ?? 3002, '0.0.0.0');
}
bootstrap();
