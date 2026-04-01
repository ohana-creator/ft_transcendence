import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import { join } from 'node:path';

async function bootstrap() {
  console.log('[CAMPAIGN SERVICE] Iniciando Campaign Service...');
  
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { cors: true },
  );
  
  console.log('[CAMPAIGN SERVICE] Aplicação Fastify criada');

  const uploadsDir = process.env.CAMPAIGN_UPLOADS_DIR ?? 'uploads';
  console.log('[CAMPAIGN SERVICE] Diretório de uploads configurado:', uploadsDir);
  
  const staticRoot = uploadsDir.startsWith('/')
    ? uploadsDir
    : join(process.cwd(), uploadsDir);
    
  console.log('[CAMPAIGN SERVICE] Caminho absoluto dos uploads:', staticRoot);

  const multipartConfig = { limits: { fileSize: 5 * 1024 * 1024 } };
  console.log('[CAMPAIGN SERVICE] Configurando fastify-multipart com limites:', multipartConfig);
  
  await app.register(fastifyMultipart as any, multipartConfig);
  console.log('[CAMPAIGN SERVICE] fastify-multipart registrado com sucesso');
  
  const staticConfig = {
    root: staticRoot,
    prefix: '/uploads/',
    cacheControl: true,
    maxAge: 31536000000,
    immutable: true,
  };
  console.log('[CAMPAIGN SERVICE] Configurando fastify-static:', staticConfig);
  
  await app.register(fastifyStatic as any, staticConfig);
  console.log('[CAMPAIGN SERVICE] fastify-static registrado com sucesso');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  
  console.log('[CAMPAIGN SERVICE] Pipes e interceptors globais configurados');

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
  
  console.log('[CAMPAIGN SERVICE] Swagger configurado em /docs');

  const port = process.env.PORT ?? 3002;
  console.log('[CAMPAIGN SERVICE] Iniciando servidor na porta:', port);
  
  await app.listen(port, '0.0.0.0');
  console.log('[CAMPAIGN SERVICE] ✅ Servidor iniciado com sucesso em http://0.0.0.0:' + port);
}
bootstrap();
