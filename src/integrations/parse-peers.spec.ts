import { parsePeers } from './parse-peers.js';

describe('parsePeers', () => {
  it('returns no peers for an empty value', () => {
    expect(parsePeers('')).toEqual({});
    expect(parsePeers('  ')).toEqual({});
  });

  it('rejects a peer without a URL', () => {
    expect(() => parsePeers('billing=')).toThrow(/billing/);
    expect(() => parsePeers('billing=ftp://files.example')).toThrow(/http/);
  });
});
