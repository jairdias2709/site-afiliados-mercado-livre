#!/usr/bin/env node
/**
 * Weekly marketing dashboard.
 *
 * Usage:
 *   node scripts/weekly-report.mjs [--days 7] [--file data/clicks.jsonl]
 *     [--conversions data/conversions.jsonl] [--cvr 0.015] [--avg-commission 12]
 *     [--goal 6000] [--out report/semanal.md]
 *
 * Reads the anonymous JSONL click log (local file or Vercel `[click]` runtime
 * log lines) and prints a Markdown report of clicks by channel/placement/product
 * plus commission progress toward the R$ 6.000/month goal.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeClicks, summarizeConversions, renderWeeklyReport, parseClickLines } from '../lib/report.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return fallback;
}

function readEvents(path) {
  try {
    return parseClickLines(readFileSync(path, 'utf8'));
  } catch {
    return [];
  }
}

const days = Number(arg('days', '7'));
const goal = Number(arg('goal', '6000'));
const cvr = arg('cvr') ? Number(arg('cvr')) : null;
const avgCommission = arg('avg-commission') ? Number(arg('avg-commission')) : null;
const clicksFile = resolve(ROOT, arg('file', 'data/clicks.jsonl'));
const conversionsFile = arg('conversions') ? resolve(ROOT, arg('conversions')) : null;

const now = Date.now();
const clicks = readEvents(clicksFile);
const conversions = conversionsFile ? readEvents(conversionsFile) : [];

const summary = summarizeClicks(clicks, { windowDays: days, now });
const convSummary = summarizeConversions(conversions, { windowDays: days, now });
const markdown = renderWeeklyReport(summary, { goal, cvr, avgCommission, conversions: convSummary });

const out = arg('out');
if (out) {
  const outPath = resolve(ROOT, out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, markdown, 'utf8');
  process.stderr.write(`relatorio escrito em ${outPath}\n`);
}
process.stdout.write(markdown);