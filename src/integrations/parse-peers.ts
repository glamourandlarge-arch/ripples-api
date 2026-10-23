export type PeerMap = Record<string, string>;

export function parsePeers(value: string): PeerMap {
  const peers: PeerMap = {};
  if (!value.trim()) {
    return peers;
  }

  for (const entry of value.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    const name = trimmed.slice(0, separator).trim();
    const url = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/\/$/, '');
    if (separator <= 0 || !name || !url) {
      throw new Error(
        `Invalid PEERS entry "${trimmed}". Expected name=http://host`,
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Peer "${name}" has an invalid URL`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Peer "${name}" must use http or https`);
    }

    peers[name] = url;
  }

  return peers;
}
