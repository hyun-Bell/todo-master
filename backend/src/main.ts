import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Node.js v18+ 부터 fetch API 내장 - polyfill 불필요

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://your-app-domain.com']
        : ['http://localhost:3000', 'http://localhost:8081'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Logger instance
  const logger = new Logger('Main');

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('TodoMaster API')
    .setDescription('TodoMaster 백엔드 API 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 5001;
  await app.listen(port);

  logger.log(`TodoMaster Backend running on port ${port}`);
  logger.log(`API Documentation available at http://localhost:${port}/api`);
}
void bootstrap();
