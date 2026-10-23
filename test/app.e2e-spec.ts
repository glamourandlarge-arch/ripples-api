import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configureApp } from '../src/configure-app.js';
import { signRequest } from '../src/integrations/handshake.js';
import { NOTE_SEEDS } from '../src/notes/notes.seed.js';

const secret = 'test-secret';

describe('Ripples API (e2e)', () => {
  let app: INestApplication<App>;
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.PORT = '8000';
    process.env.MONGODB_URI = mongo.getUri();
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    process.env.SERVICE_NAME = 'ripples-api';
    process.env.SERVICE_SHARED_SECRET = secret;
    process.env.PEERS = '';
    process.env.MESSAGING_ENABLED = 'false';
    process.env.MESSAGING_TRANSPORT = 'tcp';
    process.env.MESSAGING_HOST = '127.0.0.1';
    process.env.MESSAGING_PORT = '8001';

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
    await mongo?.stop();
  });

  it('GET /api/health reports mongo', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      details: { mongo: { status: 'up' } },
    });
  });

  it('GET /api/notes returns the seeded notes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/notes')
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
