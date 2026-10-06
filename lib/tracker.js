import { createHash } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Privacy-preserving click recorder.
 *
 * Each click is appended as one JSON line (JSONL) so it can be consumed later by
 * analytics/reporting without a database. IP addresses and user agents are hashed
 * with a salt; raw client identifiers are never written.
 */
export function createClickStore({ file, salt = 'ml-affiliate-local' } = {}) {
  const events = [];

  function hash(value) {
    if (!value) return null;
    return createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 32);
  }

  return {
    events,
    record(click) {
      const event = {
        ts: new Date().toISOString(),
        productId: click.productId,
        slug: click.slug,
        target: click.target,
        source: click.source || 'redirect',
        referer: click.referer || null,
        ipHash: hash(click.ip),
        uaHash: hash(click.userAgent),
      };
      events.push(event);
      return event;
    },
    async persist(event) {
      if (!file) return;
      await mkdir(dirname(file), { recursive: true });
      await appendFile(file, `${JSON.stringify(event)}\n`, 'utf8');
    },
  };
}
