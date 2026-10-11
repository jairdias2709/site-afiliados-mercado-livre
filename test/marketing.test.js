import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeChannel, withChannel, clickSource, channelLabel, placementLabel } from '../lib/channels.js';
import { summarizeClicks, summarizeConversions, renderWeeklyReport, parseClickLines } from '../lib/report.js';

test('normalizeChannel accepts known/marketing slugs and rejects junk', () => {
  assert.equal(normalizeChannel('Pinterest'), 'pinterest');
  assert.equal(normalizeChannel(' tiktok '), 'tiktok');
  assert.equal(normalizeChannel('comunidade'), 'comunidade');
  assert.equal(normalizeChannel('a b'), null);
  assert.equal(normalizeChannel('"><script>'), null);
  assert.equal(normalizeChannel(''), null);
  assert.equal(normalizeChannel(null), null);
  assert.equal(normalizeChannel('x'.repeat(40)), null);
});

test('withChannel appends ?ch= only when a channel is present', () => {
  assert.equal(withChannel('/produto/x', null), '/produto/x');
  assert.equal(withChannel('/produto/x', 'pinterest'), '/produto/x?ch=pinterest');
  assert.equal(withChannel('/?q=1', 'tiktok'), '/?q=1&ch=tiktok');
});

test('clickSource combines channel and placement, keeping legacy placement-only', () => {
  assert.equal(clickSource('pinterest', 'produto'), 'pinterest:produto');
  assert.equal(clickSource(null, 'card'), 'card');
});

test('labels fall back to Outros/desconhecido', () => {
  assert.equal(channelLabel('pinterest'), 'Pinterest');
  assert.equal(channelLabel('zzz'), 'Outros / nao classificado');
  assert.equal(placementLabel('categoria-moda'), 'Grade de categoria (moda)');
  assert.equal(placementLabel(''), 'desconhecido');
});

const NOW = Date.parse('2026-10-11T12:00:00.000Z');
const event = (ts, extra = {}) => ({ ts, productId: 'MLB1', slug: 'p', source: 'produto', placement: 'produto', ...extra });

test('summarizeClicks windows events and groups by channel/placement/day', () => {
  const events = [
    event('2026-10-11T09:00:00.000Z', { channel: 'pinterest' }),
    event('2026-10-11T10:00:00.000Z', { channel: 'pinterest' }),
    event('2026-10-10T10:00:00.000Z', { channel: 'tiktok' }),
    event('2026-10-01T10:00:00.000Z', { channel: 'pinterest' }),
  ];
  const s = summarizeClicks(events, { windowDays: 7, now: NOW });
  assert.equal(s.totalClicks, 3);
  assert.deepEqual(s.byChannel[0], ['pinterest', 2]);
  assert.equal(s.daily.at(-1).clicks, 2);
  assert.equal(s.daily.reduce((a, d) => a + d.clicks, 0), 3);
});

test('summarizeConversions sums commission and quantity', () => {
  const c = summarizeConversions(
    [
      { ts: '2026-10-11T00:00:00.000Z', commission: 12.5, quantity: 2 },
      { ts: '2026-10-01T00:00:00.000Z', commission: 99 },
    ],
    { windowDays: 7, now: NOW },
  );
  assert.equal(c.count, 1);
  assert.equal(c.sales, 2);
  assert.equal(c.commission, 12.5);
});

test('renderWeeklyReport mentions clicks, channel table and goal progress', () => {
  const s = summarizeClicks([event('2026-10-11T09:00:00.000Z', { channel: 'pinterest' })], { windowDays: 7, now: NOW });
  const md = renderWeeklyReport(s, { goal: 6000, cvr: 0.02, avgCommission: 12 });
  assert.match(md, /Cliques em \/go: \*\*1\*\*/);
  assert.match(md, /Pinterest/);
  assert.match(md, /Meta R\$ 6000\.00\/mes/);
});

test('parseClickLines tolerates Vercel [click] prefixes and malformed lines', () => {
  const text = [
    '[click] {"ts":"2026-10-11T09:00:00.000Z","source":"produto"}',
    'not json',
    '{"ts":"2026-10-11T10:00:00.000Z","source":"card"}',
    '',
  ].join('\n');
  const events = parseClickLines(text);
  assert.equal(events.length, 2);
  assert.equal(events[0].source, 'produto');
});