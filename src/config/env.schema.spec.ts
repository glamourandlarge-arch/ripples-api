import { validateEnv } from './env.schema.js';

const required = {
  PORT: '8000',
  MONGODB_URI: 'mongodb://localhost:27017/ripples',
  CORS_ORIGIN: 'http://localhost:3000',
  SERVICE_NAME: 'ripples-api',
  SERVICE_SHARED_SECRET: 'secret',
};

describe('validateEnv', () => {
  it('requires the service settings and defaults messaging off', () => {
    const env = validateEnv(required);

    expect(env.PORT).toBe(8000);
    expect(env.PEERS).toEqual({});
    expect(env.MESSAGING_ENABLED).toBe(false);
    expect(env.MESSAGING_TRANSPORT).toBe('tcp');
    expect(env.MESSAGING_HOST).toBe('127.0.0.1');
    expect(env.MESSAGING_PORT).toBe(8001);
  });

  it('parses named peer URLs', () => {
    const env = validateEnv({
      ...required,
      PEERS: 'billing=http://localhost:8001/, notify=https://notify.example',
    });

    expect(env.PEERS).toEqual({
      billing: 'http://localhost:8001',
      notify: 'https://notify.example',
    });
  });

  it('rejects a missing secret and a bad peer entry', () => {
    expect(() =>
      validateEnv({
        ...required,
        SERVICE_SHARED_SECRET: '',
      }),
    ).toThrow(/SERVICE_SHARED_SECRET/);

    expect(() =>
      validateEnv({
        ...required,
        PEERS: 'billing',
      }),
    ).toThrow(/PEERS/);
  });
});
