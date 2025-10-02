import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades no permitidas
      forbidNonWhitelisted: true, // lanza error si hay propiedades no permitidas
      transform: true, // transforma payloads a clases
    }),
  );
  app.use('/static', express.static(join(__dirname, '..', 'public')));
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
    credentials: false,
    maxAge: 86400,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
