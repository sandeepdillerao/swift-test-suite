import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Health check — no auth, no prefix, used by the desktop app to test connectivity
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // CORS — allow configured origins plus Electron (file:// sends Origin: null)
  const corsOrigins = configService.get<string[]>('app.corsOrigins', ['http://localhost:5173']);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Electron file://, curl, mobile apps)
      if (!origin || origin === 'null' || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serialization (respects @Exclude decorators)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger
  const swaggerEnabled = configService.get<boolean>('app.swaggerEnabled', true);
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('TestFlow TCM API')
      .setDescription('Enterprise Test Case Management Platform API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Organizations', 'Organization management endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}/${apiPrefix}`);
  console.log(`Swagger docs at: http://localhost:${port}/api/docs`);
}

bootstrap();
