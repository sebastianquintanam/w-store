// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

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

  // ✅ CORS para Vite dev server
  app.enableCors({
    origin: 'http://localhost:5173',   // o ['http://localhost:5173']
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization,Integrity-Signature',
    credentials: false, // cámbialo a true si vas a usar cookies
  });

  // Security headers (después de CORS para no sobreescribir sus headers)
  app.use(helmet());
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3001);
  console.log('🚀 Backend corriendo en http://localhost:3001');
}

bootstrap();
