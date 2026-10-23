import { ConfigService } from '@nestjs/config';
import { createMessagingClient } from './messaging.client.js';

describe('MessagingClient', () => {
  it('does not connect while messaging is disabled', async () => {
    const client = createMessagingClient({
      get: (key: string) => (key === 'MESSAGING_ENABLED' ? false : undefined),
      getOrThrow: () => {
        throw new Error('messaging settings should not be read');
      },
    } as unknown as ConfigService);

    expect(client.enabled).toBe(false);
    await expect(client.send('notes.list', {})).rejects.toThrow(
      'Messaging is disabled',
    );
  });
});
