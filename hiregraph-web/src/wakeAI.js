let lastWakeTime = 0;

export function wakeAI(force = false) {
  const now = Date.now();
  if (!force && lastWakeTime && now - lastWakeTime < 5 * 60 * 1000) {
    return;
  }
  lastWakeTime = now;
  try {
    const aiUrl = import.meta.env?.VITE_AI_SERVICE_URL || import.meta.env?.VITE_AI_URL || (typeof process !== 'undefined' && (process.env?.REACT_APP_AI_SERVICE_URL || process.env?.REACT_APP_AI_URL)) || 'https://hiregraph-ai.onrender.com';
    fetch(`${aiUrl}/health`, { mode: 'no-cors' }).catch(() => {});
  } catch {}
}
