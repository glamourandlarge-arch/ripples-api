import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HANDSHAKE_HEADERS, signRequest } from './handshake.js';
import type { PeerMap } from './parse-peers.js';

@Injectable()
export class PeerClient {
  constructor(private readonly config: ConfigService) {}

  async request<T>(
    peer: string,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const peers = this.config.getOrThrow<PeerMap>('PEERS');
    const baseUrl = peers[peer];
    if (!baseUrl) {
      throw new Error(`Peer "${peer}" is not configured`);
    }

    const pathname = path.startsWith('/') ? path : `/${path}`;
    const payload = body === undefined ? '' : JSON.stringify(body);
    const timestamp = Date.now().toString();
    const signature = signRequest(
      this.config.getOrThrow<string>('SERVICE_SHARED_SECRET'),
      {
        method,
        path: pathname,
        timestamp,
        body: payload,
      },
    );

    const response = await fetch(`${baseUrl}${pathname}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(payload ? { 'content-type': 'application/json' } : {}),
        [HANDSHAKE_HEADERS.serviceName]:
          this.config.getOrThrow<string>('SERVICE_NAME'),
        [HANDSHAKE_HEADERS.timestamp]: timestamp,
        [HANDSHAKE_HEADERS.signature]: signature,
      },
      body: payload || undefined,
    });

    if (!response.ok) {
      throw new Error(`Peer "${peer}" responded with ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
