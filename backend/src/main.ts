// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Captura el raw body para verificar la firma del webhook
  app.use(
    json({
      verify: (req: any, _res, buf: Buffer) => {
        req.rawBody = buf; // <- lo usaremos en el controller
      },
    }),
  );

  // También habilita el manejo de formularios urlencoded (opcional)
  app.use(
    urlencoded({
      extended: true,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000);
  console.log('🚀 Backend corriendo en http://localhost:3000');
}

bootstrap();
