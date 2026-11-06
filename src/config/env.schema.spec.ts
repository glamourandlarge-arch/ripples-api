import { validateEnv } from './env.schema.js';

const required = {
  PORT: '8000',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: 'postgres',
  POSTGRES_DB: 'ripples',
  CORS_ORIGIN: 'http://localhost:3000',
  SERVICE_NAME: 'ripples-api',
  SERVICE_SHARED_SECRET: 'secret',
  JWT_SECRET: '12345678901234567890123456789012',
};

describe('validateEnv', () => {
  it('requires the service settings and defaults messaging off', () => {
    const env = validateEnv(required);

    expect(env.PORT).toBe(8000);
    expect(env.POSTGRES_HOST).toBe('localhost');
    expect(env.POSTGRES_PORT).toBe(5432);
    expect(env.POSTGRES_USER).toBe('postgres');
    expect(env.POSTGRES_DB).toBe('ripples');
    expect(env.POSTGRES_SSL).toBe(false);
    expect(env.PEERS).toEqual({});
    expect(env.HTTP_TRUST_PROXY).toBe('false');
    expect(env.SWAGGER_ENABLED).toBe(false);
    expect(env.MESSAGING_ENABLED).toBe(false);
    expect(env.MESSAGING_TRANSPORT).toBe('tcp');
    expect(env.MESSAGING_HOST).toBe('127.0.0.1');
    expect(env.MESSAGING_PORT).toBe(8001);
    expect(env.JWT_SECRET).toBe('12345678901234567890123456789012');
    expect(env.JWT_EXPIRES_IN).toBe('1h');
    expect(env.OTP_TTL_SECONDS).toBe(300);
    expect(env.OTP_DEBUG).toBe(false);
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

  it('rejects an incomplete postgres configuration', () => {
    expect(() =>
      validateEnv({
        ...required,
        POSTGRES_HOST: '',
      }),
    ).toThrow(/POSTGRES_HOST/);

    expect(() =>
      validateEnv({
        ...required,
        POSTGRES_PORT: '0',
      }),
    ).toThrow(/POSTGRES_PORT/);

    expect(() =>
      validateEnv({
        ...required,
        POSTGRES_SSL: 'yes',
      }),
    ).toThrow(/POSTGRES_SSL/);
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

    expect(() =>
      validateEnv({
        ...required,
        JWT_SECRET: 'too-short',
      }),
    ).toThrow(/JWT_SECRET/);

    expect(() =>
      validateEnv({
        ...required,
        JWT_EXPIRES_IN: 'tomorrow',
      }),
    ).toThrow(/JWT_EXPIRES_IN/);
  });
});
