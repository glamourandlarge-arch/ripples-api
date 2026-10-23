import { ConfigService } from '@nestjs/config';
import { HANDSHAKE_HEADERS, signRequest } from './handshake.js';
import { PeerClient } from './peer-client.service.js';

function configFor(peers: Record<string, string>) {
  const values: Record<string, unknown> = {
    PEERS: peers,
    SERVICE_NAME: 'ripples-api',
    SERVICE_SHARED_SECRET: 'secret',
  };

  return {
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('PeerClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses a peer that is not configured', async () => {
    const client = new PeerClient(configFor({}));

    await expect(
      client.request('billing', 'GET', '/api/health'),
    ).rejects.toThrow('Peer "billing" is not configured');
  });

  it('sends a signed request to the named peer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = new PeerClient(
      configFor({ billing: 'http://localhost:8001' }),
    );

    await expect(
      client.request('billing', 'POST', '/api/internal/ping', { ok: true }),
    ).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ];
    expect(url).toBe('http://localhost:8001/api/internal/ping');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"ok":true}');
    expect(init.headers[HANDSHAKE_HEADERS.serviceName]).toBe('ripples-api');
    expect(init.headers[HANDSHAKE_HEADERS.signature]).toBe(
      signRequest('secret', {
        method: 'POST',
        path: '/api/internal/ping',
        timestamp: init.headers[HANDSHAKE_HEADERS.timestamp] ?? '',
        body: init.body,
      }),
    );
  });
});
