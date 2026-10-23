import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

export function configureApp(app: INestApplication, config: ConfigService) {
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN'),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}
