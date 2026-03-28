import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // ── CORS Configuration ──────────────────────────────────
  app.enableCors({
    origin: true, // Em produção, especificar domínios permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // ── Parsers de conteúdo adicionais ──────────────────────
  // O gateway precisa de encaminhar multipart/form-data (ex: upload de avatar)
  // sem parsing — o body é tratado como buffer e enviado tal qual ao serviço.
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addContentTypeParser(
    'multipart/form-data',
    { parseAs: 'buffer' },
    (_req: any, body: Buffer, done: (err: null, body: Buffer) => void) => {
      done(null, body);
    },
  );

  // ── Global pipes e interceptors ─────────────────────────
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ── Swagger ─────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('VAKS API Gateway')
    .setDescription('Ponto de entrada unificado — encaminha pedidos para os microserviços')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter your JWT token' },
      'bearer',
    )
    .build();

  const swagger = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, swagger, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
