import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import {
  SWAGGER_PATH,
  swaggerDocument,
  swaggerUiAssetsPath,
} from './config/swagger.config.js';
import { configureTrustProxy } from './config/trustProxy.config.js';
import { configureApp } from './configure-app.js';
import {
  buildTransportOptions,
  readMessagingSettings,
} from './messaging/transport-options.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);
  configureApp(app, config);
  configureTrustProxy(app, config);

  if (config.get<boolean>('SWAGGER_ENABLED')) {
    SwaggerModule.setup(SWAGGER_PATH, app, swaggerDocument(app), {
      customSwaggerUiPath: swaggerUiAssetsPath(),
      jsonDocumentUrl: `${SWAGGER_PATH}.json`,
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  if (config.get<boolean>('MESSAGING_ENABLED') === true) {
    app.connectMicroservice(
      buildTransportOptions(readMessagingSettings(config)),
    );
    await app.startAllMicroservices();
  }

  await app.listen(config.getOrThrow<number>('PORT'));
}

await bootstrap();
