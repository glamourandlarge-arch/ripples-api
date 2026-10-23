import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  buildTransportOptions,
  readMessagingSettings,
} from './transport-options.js';

@Injectable()
export class MessagingClient implements OnModuleDestroy {
  readonly enabled: boolean;
  private readonly client: ClientProxy | null;

  constructor(config: ConfigService) {
    this.enabled = config.get<boolean>('MESSAGING_ENABLED') === true;
    this.client = this.enabled
      ? ClientProxyFactory.create(
          buildTransportOptions(readMessagingSettings(config)),
        )
      : null;
  }

  async send<T>(pattern: string, payload: unknown): Promise<T> {
    if (!this.client) {
      throw new Error('Messaging is disabled');
    }

    return await firstValueFrom(this.client.send<T>(pattern, payload));
  }

  async onModuleDestroy() {
    await this.client?.close();
  }
}

export function createMessagingClient(config: ConfigService) {
  return new MessagingClient(config);
}
