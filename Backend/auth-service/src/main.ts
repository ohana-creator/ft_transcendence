import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  
  const config = new DocumentBuilder()
    .setTitle('Vaks API Module #1')
    .setDescription('VAKS Auth Module Web Application API')
    .setVersion('1.0')
    .addBasicAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Enter JWT token',
      in: 'header',
    })
    .addTag('VAKS')
    .build();

  const swagger = SwaggerModule.createDocument(app as NestFastifyApplication, config);

  SwaggerModule.setup('docs', app as NestFastifyApplication, swagger, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
