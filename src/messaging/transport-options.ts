import { ConfigService } from '@nestjs/config';
import { Transport, type ClientOptions } from '@nestjs/microservices';

export type MessagingTransport = 'tcp' | 'redis';

export type MessagingSettings = {
  transport: MessagingTransport;
  host: string;
  port: number;
};

export function readMessagingSettings(
  config: ConfigService,
): MessagingSettings {
  return {
    transport: config.getOrThrow<MessagingTransport>('MESSAGING_TRANSPORT'),
    host: config.getOrThrow<string>('MESSAGING_HOST'),
    port: config.getOrThrow<number>('MESSAGING_PORT'),
  };
}

export function buildTransportOptions(
  settings: MessagingSettings,
): ClientOptions {
  const options = {
    host: settings.host,
    port: settings.port,
  };

  if (settings.transport === 'redis') {
    return {
      transport: Transport.REDIS,
      options,
    };
  }

  return {
    transport: Transport.TCP,
    options,
  };
}
