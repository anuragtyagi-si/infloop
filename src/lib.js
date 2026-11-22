export const money = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(value);

export function estimateCampaign(budget, objective = 'Awareness', weeks = 6) {
  const safeBudget = Math.min(300000, Math.max(1000, Number(budget) || 1000));
  const creators = Math.max(2, Math.round(safeBudget * 0.65 / (objective === 'Conversions' ? 1900 : 1400)));
  const reach = Math.round(safeBudget * (objective === 'Awareness' ? 95 : objective === 'Engagement' ? 70 : 45));
  return { creators, content: creators * (weeks >= 8 ? 4 : 3), reach, tier: safeBudget <= 10000 ? 'Pilot' : safeBudget <= 75000 ? 'Growth' : 'Flagship' };
}

export function downloadJSON(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readStored(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browsing remains available when storage is disabled. */ }
}
