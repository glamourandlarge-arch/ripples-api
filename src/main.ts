import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import {
  buildTransportOptions,
  readMessagingSettings,
} from './messaging/transport-options.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  configureApp(app, config);

  if (config.get<boolean>('MESSAGING_ENABLED') === true) {
    app.connectMicroservice(
      buildTransportOptions(readMessagingSettings(config)),
    );
    await app.startAllMicroservices();
  }

  await app.listen(config.getOrThrow<number>('PORT'));
}

await bootstrap();
