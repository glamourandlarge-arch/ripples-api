import {
  HANDSHAKE_MAX_SKEW_MS,
  HandshakeError,
  requestPath,
  signRequest,
  verifyHandshake,
} from './handshake.js';

const secret = 'secret';
const input = {
  method: 'post',
  path: '/api/internal/ping?trace=1',
  timestamp: '1000',
  body: '{"ok":true}',
};

describe('handshake', () => {
  it('signs the method, path, timestamp, and body', () => {
    const signature = signRequest(secret, input);

    expect(requestPath(input.path)).toBe('/api/internal/ping');
    expect(signature).toHaveLength(64);
    expect(signRequest(secret, input)).toBe(signature);
    expect(signRequest(secret, { ...input, body: '{"ok":false}' })).not.toBe(
      signature,
    );
  });

  it('accepts a fresh matching signature and rejects stale or altered ones', () => {
    const timestamp = '1000';
    const signature = signRequest(secret, { ...input, timestamp });
    const check = {
      ...input,
      timestamp,
      signature,
      serviceName: 'billing',
      secret,
      now: 1000,
    };

    expect(() => verifyHandshake(check)).not.toThrow();
    expect(() =>
      verifyHandshake({ ...check, now: 1000 + HANDSHAKE_MAX_SKEW_MS + 1 }),
    ).toThrow(HandshakeError);
    expect(() => verifyHandshake({ ...check, signature: 'abc' })).toThrow(
      /Invalid service handshake/,
    );
    expect(() => verifyHandshake({ ...check, serviceName: undefined })).toThrow(
      /Missing service handshake headers/,
    );
  });
});
