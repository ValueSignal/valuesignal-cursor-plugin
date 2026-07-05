const PLUGIN_CLIENT = 'valuesignal-cursor-plugin/1.0.7';

export function getApiBase() {
  const raw = (process.env.VALUESIGNAL_API_BASE || 'https://app.valuesignal.ai').trim();
  return raw.replace(/\/$/, '').replace(/\/api$/, '');
}

export function getJwt() {
  return (
    process.env.VALUESIGNAL_JWT_TOKEN?.trim() ||
    process.env.VALUESIGNAL_JWT?.trim() ||
    ''
  );
}

export function getPluginClientHeader() {
  return PLUGIN_CLIENT;
}
