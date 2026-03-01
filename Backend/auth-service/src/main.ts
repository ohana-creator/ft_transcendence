import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
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
