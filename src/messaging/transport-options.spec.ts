import { Transport } from '@nestjs/microservices';
import { buildTransportOptions } from './transport-options.js';

describe('buildTransportOptions', () => {
  it('builds a TCP listener by default and Redis when selected', () => {
    expect(
      buildTransportOptions({
        transport: 'tcp',
        host: '127.0.0.1',
        port: 8001,
      }),
    ).toEqual({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 8001 },
    });

    expect(
      buildTransportOptions({
        transport: 'redis',
        host: '127.0.0.1',
        port: 6379,
      }),
    ).toEqual({
      transport: Transport.REDIS,
      options: { host: '127.0.0.1', port: 6379 },
    });
  });
});
