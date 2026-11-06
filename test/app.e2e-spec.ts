import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configureApp } from '../src/configure-app.js';
import { signRequest } from '../src/integrations/handshake.js';
import { NOTE_SEEDS } from '../src/notes/notes.seed.js';

const secret = 'test-secret';
const jwtSecret = '12345678901234567890123456789012';

describe('Ripples API (e2e)', () => {
  let app: INestApplication<App>;
  let db: PGlite;
  let server: PGLiteSocketServer;

  beforeAll(async () => {
    db = await PGlite.create();
    server = new PGLiteSocketServer({
      db,
      host: '127.0.0.1',
      port: 0,
      maxConnections: 20,
    });
    await server.start();

    const address = server.getServerConn();
    const separator = address.lastIndexOf(':');
    process.env.PORT = '8000';
    process.env.POSTGRES_HOST = address.slice(0, separator);
    process.env.POSTGRES_PORT = address.slice(separator + 1);
    process.env.POSTGRES_USER = 'postgres';
    process.env.POSTGRES_PASSWORD = 'postgres';
    process.env.POSTGRES_DB = 'postgres';
    process.env.POSTGRES_SSL = 'false';
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    process.env.SERVICE_NAME = 'ripples-api';
    process.env.SERVICE_SHARED_SECRET = secret;
    process.env.PEERS = '';
    process.env.MESSAGING_ENABLED = 'false';
    process.env.MESSAGING_TRANSPORT = 'tcp';
    process.env.MESSAGING_HOST = '127.0.0.1';
    process.env.MESSAGING_PORT = '8001';
    process.env.JWT_SECRET = jwtSecret;
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.OTP_TTL_SECONDS = '300';
    process.env.OTP_DEBUG = 'true';

    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    configureApp(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await server?.stop();
    await db?.close();
  });

  async function accessToken(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email,
        name: 'Owner',
        password: 'correct-horse',
      })
      .expect(201);

    expect(response.body.user).not.toHaveProperty('passwordHash');
    return response.body.accessToken as string;
  }

  it('GET /api/health reports postgres', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      details: { postgres: { status: 'up' } },
    });
  });

  it('GET /api/notes returns the seeded notes', async () => {
    await request(app.getHttpServer()).get('/api/notes').expect(401);

    const token = await accessToken('notes-owner@example.com');
    const response = await request(app.getHttpServer())
      .get('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual(
      NOTE_SEEDS.map((note) => expect.objectContaining(note)),
    );
    expect(response.body).toHaveLength(NOTE_SEEDS.length);
    for (const note of response.body as Array<Record<string, unknown>>) {
      expect(typeof note.id).toBe('string');
      expect(note).not.toHaveProperty('_id');
    }
  });

  it('GET /api/internal/ping requires a fresh signature', async () => {
    await request(app.getHttpServer()).get('/api/internal/ping').expect(401);

    const path = '/api/internal/ping';
    const timestamp = Date.now().toString();
    const signature = signRequest(secret, {
      method: 'GET',
      path,
      timestamp,
      body: '',
    });

    const response = await request(app.getHttpServer())
      .get(path)
      .set('x-service-name', 'billing')
      .set('x-timestamp', timestamp)
      .set('x-signature', signature)
      .expect(200);

    expect(response.body).toEqual({ ok: true, service: 'ripples-api' });

    await request(app.getHttpServer())
      .get(path)
      .set('x-service-name', 'billing')
      .set('x-timestamp', String(Date.now() - 10 * 60 * 1000))
      .set('x-signature', signature)
      .expect(401);
  });

  it('registers, logs in, and reads the current user', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);

    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: ' Grace@Example.com ',
        name: '  Grace Hopper  ',
        password: 'correct-horse',
      })
      .expect(201);

    expect(registered.body.user).toMatchObject({
      email: 'grace@example.com',
      name: 'Grace Hopper',
    });
    expect(registered.body.user).not.toHaveProperty('passwordHash');
    expect(typeof registered.body.accessToken).toBe('string');

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({
      id: registered.body.user.id,
      email: 'grace@example.com',
    });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'grace@example.com', password: 'correct-horse' })
      .expect(200);
    expect(typeof login.body.accessToken).toBe('string');
    expect(login.body.user).not.toHaveProperty('passwordHash');

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'grace@example.com', password: 'wrong-password' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'missing@example.com', password: 'correct-horse' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'grace@example.com',
        name: 'Grace Hopper',
        password: 'correct-horse',
      })
      .expect(409);
  });

  it('manages users', async () => {
    await request(app.getHttpServer()).get('/api/users').expect(401);

    const token = await accessToken('users-owner@example.com');
    const created = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: ' Ada@Example.com ',
        name: '  Ada Lovelace  ',
        password: 'correct-horse',
      })
      .expect(201);

    expect(created.body.user).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      phone: null,
    });
    expect(typeof created.body.user.id).toBe('string');
    expect(created.body.user).not.toHaveProperty('passwordHash');

    const id = created.body.user.id as string;

    const listed = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listed.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id })]),
    );

    const fetched = await request(app.getHttpServer())
      .get(`/api/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(fetched.body).toMatchObject({ id, email: 'ada@example.com' });

    const updated = await request(app.getHttpServer())
      .patch(`/api/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ada' })
      .expect(200);
    expect(updated.body).toMatchObject({ id, name: 'Ada' });

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'ada@example.com',
        name: 'Duplicate',
        password: 'correct-horse',
      })
      .expect(409);

    await request(app.getHttpServer())
      .get('/api/users/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/users/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('registers and logs in with phone OTP', async () => {
    const phone = '08012345678';

    const sent = await request(app.getHttpServer())
      .post('/api/auth/otp/send')
      .send({ phone })
      .expect(200);

    expect(sent.body).toMatchObject({ ok: true });
    expect(sent.body.debugCode).toMatch(/^\d{6}$/);

    await request(app.getHttpServer())
      .post('/api/auth/otp/verify')
      .send({ phone, code: '000000' })
      .expect(401);

    const verified = await request(app.getHttpServer())
      .post('/api/auth/otp/verify')
      .send({ phone, code: sent.body.debugCode })
      .expect(200);

    expect(verified.body.user).toMatchObject({
      phone: '+2348012345678',
      email: null,
      name: 'Ripples user',
    });
    expect(typeof verified.body.accessToken).toBe('string');

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${verified.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({
      id: verified.body.user.id,
      phone: '+2348012345678',
    });

    const resent = await request(app.getHttpServer())
      .post('/api/auth/otp/send')
      .send({ phone: '+2348012345678' })
      .expect(200);

    const again = await request(app.getHttpServer())
      .post('/api/auth/otp/verify')
      .send({ phone: '+2348012345678', code: resent.body.debugCode })
      .expect(200);

    expect(again.body.user.id).toBe(verified.body.user.id);
  });

  it('GET /api/missing returns the error body', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/missing')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      path: '/api/missing',
    });
    expect(typeof response.body.timestamp).toBe('string');
  });
});
