import {
  INestApplication,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { flattenValidationErrors } from './common/validation/flatten-validation-errors.js';

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
      exceptionFactory: (errors) => {
        const fieldErrors = flattenValidationErrors(errors);
        const firstMessage =
          Object.values(fieldErrors)[0]?.[0] ?? 'Validation failed';
        return new UnprocessableEntityException({
          message: firstMessage,
          errors: fieldErrors,
        });
      },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
}
