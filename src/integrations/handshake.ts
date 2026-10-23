import { createHmac, timingSafeEqual } from 'node:crypto';

export const HANDSHAKE_HEADERS = {
  serviceName: 'x-service-name',
  timestamp: 'x-timestamp',
  signature: 'x-signature',
} as const;

export const HANDSHAKE_MAX_SKEW_MS = 5 * 60 * 1000;

export class HandshakeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandshakeError';
  }
}

export type SignatureInput = {
  method: string;
  path: string;
  timestamp: string;
  body: string;
};

export function requestPath(originalUrl: string): string {
  const queryIndex = originalUrl.indexOf('?');
  const path =
    queryIndex === -1 ? originalUrl : originalUrl.slice(0, queryIndex);
  return path.startsWith('/') ? path : `/${path}`;
}

export function signRequest(secret: string, input: SignatureInput): string {
  const payload = [
    input.method.toUpperCase(),
    requestPath(input.path),
    input.timestamp,
    input.body,
  ].join('\n');

  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function signaturesMatch(expected: string, received: string): boolean {
  const left = Buffer.from(expected.toLowerCase());
  const right = Buffer.from(received.toLowerCase());
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export type HandshakeCheck = {
  method: string;
  path: string;
  timestamp: string | undefined;
  body: string;
  serviceName: string | undefined;
  signature: string | undefined;
  secret: string;
  now?: number;
};

export function verifyHandshake(input: HandshakeCheck): void {
  if (!input.serviceName || !input.timestamp || !input.signature) {
    throw new HandshakeError('Missing service handshake headers');
  }

  if (!/^\d+$/.test(input.timestamp)) {
    throw new HandshakeError('Invalid service handshake timestamp');
  }

  const sentAt = Number(input.timestamp);
  const now = input.now ?? Date.now();
  if (Math.abs(now - sentAt) > HANDSHAKE_MAX_SKEW_MS) {
    throw new HandshakeError('Stale service handshake');
  }

  const expected = signRequest(input.secret, {
    method: input.method,
    path: input.path,
    timestamp: input.timestamp,
    body: input.body,
  });
  if (!signaturesMatch(expected, input.signature)) {
    throw new HandshakeError('Invalid service handshake');
  }
}
