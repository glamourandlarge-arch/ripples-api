import { createRequire } from 'node:module';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_CONFIG = new DocumentBuilder()
  .setTitle('Ripples API')
  .setDescription('HTTP API documentation for the Ripples platform.')
  .setVersion('1.0')
  .addBearerAuth(
    {
      bearerFormat: 'JWT',
      scheme: 'bearer',
      type: 'http',
    },
    'access-token',
  )
  .build();

export const SWAGGER_PATH = 'api-docs';

const nodeRequire = createRequire(import.meta.url);

export function swaggerDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, SWAGGER_CONFIG, {
    deepScanRoutes: true,
  });
}

export function swaggerUiAssetsPath(): string {
  const getSwaggerUiAbsolutePath = nodeRequire(
    'swagger-ui-dist/absolute-path.js',
  ) as () => string;

  return getSwaggerUiAbsolutePath();
}
