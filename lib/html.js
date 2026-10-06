export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (Number.isNaN(number)) return escapeHtml(value);
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
