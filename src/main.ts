import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const envOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const allowedOrigins =
    envOrigins.length > 0 ? envOrigins : ['http://localhost:8080'];

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades no permitidas
      forbidNonWhitelisted: true, // lanza error si hay propiedades no permitidas
      transform: true, // transforma payloads a clases
    }),
  );
  const isProd = process.env.NODE_ENV === 'production';
  app.use('/static', express.static(join(__dirname, '..', 'public')));
  if(!isProd){
    app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(
        new Error(`Origin ${origin} is not allowed by CORS policy.`),
        false,
      );
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  });
}
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
