/**
 * Weekly marketing report engine.
 *
 * Pure, dependency-free aggregation of anonymous click events (the JSONL
 * written by lib/tracker.js) plus optional confirmed conversions, rendered as a
 * Markdown dashboard used to steer channels toward the R$ 6.000/month net goal.
 */
import { channelLabel, placementLabel } from './channels.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(iso) {
  return String(iso).slice(0, 10);
}

function inWindow(ts, startMs) {
  const value = Date.parse(ts);
  return Number.isFinite(value) && value >= startMs;
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item) ?? 'nao-classificado';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(b[0]));
}

export function summarizeClicks(events, { windowDays = 7, now = Date.now() } = {}) {
  const startMs = now - windowDays * DAY_MS;
  const clicks = events.filter((e) => e && inWindow(e.ts, startMs));
  const days = [];
  for (let i = windowDays - 1; i >= 0; i -= 1) days.push(new Date(now - i * DAY_MS).toISOString().slice(0, 10));

  const byDay = new Map(countBy(clicks, (e) => dayKey(e.ts)));
  return {
    windowDays,
    generatedAt: new Date(now).toISOString(),
    totalClicks: clicks.length,
    uniqueProducts: new Set(clicks.map((e) => e.productId).filter(Boolean)).size,
    byChannel: countBy(clicks, (e) => e.channel || 'nao-classificado'),
    byPlacement: countBy(clicks, (e) => e.placement || e.source || 'redirect'),
    byProduct: countBy(clicks, (e) => e.productId || e.slug),
    daily: days.map((day) => ({ day, clicks: byDay.get(day) || 0 })),
  };
}

export function summarizeConversions(conversions, { windowDays = 7, now = Date.now() } = {}) {
  const startMs = now - windowDays * DAY_MS;
  const rows = (conversions || []).filter((c) => c && inWindow(c.ts, startMs));
  const commission = rows.reduce((sum, c) => sum + (Number(c.commission) || 0), 0);
  const sales = rows.reduce((sum, c) => sum + (Number(c.quantity) || 1), 0);
  return { count: rows.length, sales, commission: Math.round(commission * 100) / 100 };
}

function table(rows, headerA, headerB, labelFn = (x) => x) {
  if (!rows.length) return '_sem dados no periodo_';
  const lines = [`| ${headerA} | ${headerB} |`, '| --- | ---: |'];
  for (const [key, value] of rows) lines.push(`| ${labelFn(key)} | ${value} |`);
  return lines.join('\n');
}

export function renderWeeklyReport(summary, { goal = 6000, cvr = null, avgCommission = null, conversions = null } = {}) {
  const conv = conversions || { count: 0, sales: 0, commission: 0 };
  const lines = [];
  lines.push(`# Relatorio semanal - trafego e conversao`);
  lines.push('');
  lines.push(`Periodo: ultimos ${summary.windowDays} dias (gerado em ${summary.generatedAt}).`);
  lines.push('');
  lines.push(`- Cliques em /go: **${summary.totalClicks}**`);
  lines.push(`- Produtos com clique: **${summary.uniqueProducts}**`);
  lines.push(`- Conversoes confirmadas: **${conv.sales}** venda(s) / **R$ ${conv.commission.toFixed(2)}** de comissao`);
  lines.push('');

  if (cvr !== null && summary.totalClicks > 0 && conv.sales === 0) {
    const estSales = summary.totalClicks * Number(cvr);
    const estCommission = avgCommission !== null ? estSales * Number(avgCommission) : null;
    lines.push('## Projecao (sem conversoes confirmadas)');
    lines.push('');
    lines.push(`- CVR assumida: ${(Number(cvr) * 100).toFixed(2)}%`);
    if (estCommission !== null) {
      lines.push(`- Ticket medio de comissao: R$ ${Number(avgCommission).toFixed(2)}`);
      lines.push(`- Vendas estimadas: **${estSales.toFixed(2)}** -> comissao estimada **R$ ${estCommission.toFixed(2)}**`);
      const pct = ((estCommission / goal) * 100).toFixed(1);
      lines.push(`- Meta R$ ${goal.toFixed(2)}/mes: **${pct}%** no ritmo atual (${goal > estCommission ? `faltam R$ ${(goal - estCommission).toFixed(2)}` : 'meta batida'})`);
    }
    lines.push('');
  } else if (conv.sales > 0) {
    const cvrReal = summary.totalClicks ? (conv.sales / summary.totalClicks) * 100 : 0;
    const pct = ((conv.commission / goal) * 100).toFixed(1);
    lines.push('## Conversao real');
    lines.push('');
    lines.push(`- CVR real: **${cvrReal.toFixed(2)}%** (${conv.sales}/${summary.totalClicks})`);
    lines.push(`- Comissao acumulada: **R$ ${conv.commission.toFixed(2)}** = **${pct}%** da meta de R$ ${goal.toFixed(2)}/mes`);
    lines.push('');
  }

  lines.push('## Cliques por canal');
  lines.push('');
  lines.push(table(summary.byChannel, 'Canal', 'Cliques', channelLabel));
  lines.push('');
  lines.push('## Cliques por posicao na pagina');
  lines.push('');
  lines.push(table(summary.byPlacement, 'Posicao', 'Cliques', placementLabel));
  lines.push('');
  lines.push('## Top produtos por cliques');
  lines.push('');
  lines.push(table(summary.byProduct.slice(0, 10), 'Produto', 'Cliques'));
  lines.push('');
  lines.push('## Cliques por dia');
  lines.push('');
  lines.push('| Dia | Cliques |');
  lines.push('| --- | ---: |');
  for (const d of summary.daily) lines.push(`| ${d.day} | ${d.clicks} |`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

export function parseClickLines(text) {
  const events = [];
  for (const raw of String(text).split('\n')) {
    const line = raw.trim().replace(/^\[click\]\s*/, '');
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && parsed.ts) events.push(parsed);
    } catch {
      // ignore malformed lines (e.g. interleaved runtime logs)
    }
  }
  return events;
}