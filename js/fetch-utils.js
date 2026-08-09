// ============================================================
// fetch-utils.js — fetch() con timeout, condiviso da tutti i widget
// dell'Hub (badge, polvere, negozio, amici, messaggi).
// ------------------------------------------------------------
// FIX: tutte queste chiamate usavano fetch() nudo, senza timeout. Sul
// piano gratuito di Render, se il server era in stand-by, la richiesta
// restava bloccata in silenzio (a volte per minuti) e il widget non
// mostrava mai nulla — sembrava "non carica" ma era ancora in attesa.
// Ora c'è sempre un limite massimo di attesa, e chi chiama può reagire.
// ============================================================
window.lsdFetch = function (url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};
