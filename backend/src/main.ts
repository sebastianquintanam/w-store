import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,              // elimina props extra
    forbidNonWhitelisted: true,   // lanza 400 si vienen props no permitidas
    transform: true,              // castea tipos
  }));

  await app.listen(3000);
}
bootstrap();
