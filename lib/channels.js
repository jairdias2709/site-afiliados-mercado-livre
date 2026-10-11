/**
 * Canonical marketing channels for click attribution.
 *
 * Marketing links point at site pages with `?src=<channel>` (e.g.
 * `/produto/tenis-x?src=pinterest`). The page captures that channel and
 * propagates it internally as `?ch=<channel>` on product links and on the
 * `/go/:id` CTA, so the recorded click keeps both the acquisition channel and
 * the on-page placement.
 */
export const CHANNELS = {
  organico: 'Busca organica',
  google: 'Google / busca organica',
  bing: 'Bing / busca organica',
  pinterest: 'Pinterest',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  youtube: 'YouTube',
  comunidade: 'Comunidades',
  reddit: 'Reddit',
  email: 'Newsletter / e-mail',
  direto: 'Acesso direto',
  outros: 'Outros',
};

export const PLACEMENTS = {
  'home-feature': 'Destaque da home',
  card: 'Grade da home',
  produto: 'Botao principal do produto',
  sticky: 'CTA fixo mobile',
  relacionados: 'Produtos relacionados',
  'cross-sell': 'Quem viu tambem comprou',
};

const SLUG = /^[a-z0-9][a-z0-9-]{0,31}$/;

export function normalizeChannel(raw) {
  if (raw === undefined || raw === null) return null;
  const slug = String(raw).trim().toLowerCase();
  if (!SLUG.test(slug)) return null;
  return slug;
}

export function isKnownChannel(raw) {
  return Object.prototype.hasOwnProperty.call(CHANNELS, normalizeChannel(raw));
}

export function channelLabel(raw) {
  const slug = normalizeChannel(raw);
  return (slug && CHANNELS[slug]) || 'Outros / nao classificado';
}

export function placementLabel(raw) {
  const slug = String(raw ?? '').trim().toLowerCase();
  if (PLACEMENTS[slug]) return PLACEMENTS[slug];
  if (slug.startsWith('categoria-')) return `Grade de categoria (${slug.slice('categoria-'.length)})`;
  return slug || 'desconhecido';
}

export function withChannel(path, channel) {
  const slug = normalizeChannel(channel);
  if (!slug) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}ch=${slug}`;
}

export function clickSource(channel, placement) {
  const ch = normalizeChannel(channel);
  const pos = placement || 'redirect';
  return ch ? `${ch}:${pos}` : pos;
}