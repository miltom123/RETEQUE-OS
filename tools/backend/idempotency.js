/**
 * Resultados por clave de idempotencia, para que un reintento no cree otro pedido.
 * Vive en memoria durante 24 horas: tras reiniciar el servidor, una clave vieja se trata como nueva.
 * Cuando exista la tabla `idempotency_keys` en PostgreSQL, este módulo se reemplaza por ella.
 */
class IdempotencyConflict extends Error {}

function createIdempotencyStore({ ttlMs = 24 * 60 * 60 * 1000, max = 5000 } = {}) {
  const entries = new Map(); // clave -> { expiresAt, fingerprint, promise }

  function prune(now) {
    for (const [key, entry] of entries) if (entry.expiresAt <= now) entries.delete(key);
    while (entries.size > max) entries.delete(entries.keys().next().value);
  }

  return {
    // Ejecuta `work` una sola vez por clave; los reintentos, incluso simultáneos, reciben el mismo resultado
    run(key, fingerprint, work) {
      const now = Date.now();
      prune(now);
      const found = entries.get(key);
      if (found) {
        if (found.fingerprint !== fingerprint) return Promise.reject(new IdempotencyConflict('Esta clave ya se usó para otro pedido.'));
        return found.promise;
      }
      const promise = Promise.resolve().then(work);
      entries.set(key, { expiresAt: now + ttlMs, fingerprint, promise });
      // Si falla, la clave se libera para que el cliente pueda reintentar
      promise.catch(() => entries.delete(key));
      return promise;
    },
  };
}

module.exports = { createIdempotencyStore, IdempotencyConflict };
