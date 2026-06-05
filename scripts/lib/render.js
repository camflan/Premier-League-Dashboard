const INJECTION_MARKER = '/* __DATA_INJECTION_POINT__ */';

// Pure render: (data, template) → full HTML page string.
export function renderHTML(data, template) {
  if (!template.includes(INJECTION_MARKER)) {
    throw new Error(`Injection marker not found in template: ${INJECTION_MARKER}`);
  }

  const activeShort = data.activeSeason.slice(2); // "2025-26" → "25-26"
  const activeShortSlash = activeShort.replace('-', '/'); // → "25/26"

  const injection = `window.__DATA = ${JSON.stringify(data, null, 2)};`;
  return template
    .replace(INJECTION_MARKER, injection)
    .replaceAll('{{ACTIVE_SEASON_SHORT}}', activeShortSlash);
}
