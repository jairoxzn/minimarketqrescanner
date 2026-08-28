/**
 * Rate limiter en memoria, por proceso — sin infraestructura nueva (Redis/Upstash)
 * a propósito, siguiendo el mismo criterio que el resto del MVP (ver README:
 * fallback de SMTP, reset de contraseña asistido por admin, etc.).
 *
 * Limitación conocida: se reinicia al reiniciar el servidor y NO se comparte
 * entre instancias si el proceso escala horizontalmente. Para eso, cambiar
 * este módulo por un backend compartido (Redis) sin tocar los call sites.
 *
 * Solo cuenta intentos FALLIDOS (o el evento explícito que se quiera limitar,
 * ej. cada solicitud de recuperación de contraseña) — un usuario legítimo que
 * acierta la contraseña nunca debe acercarse al límite.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

let lastSweep = Date.now();
function sweep(maxWindowMs: number) {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > maxWindowMs) buckets.delete(key);
  }
}

export interface RateLimitStatus {
  limited: boolean;
  retryAfterMs: number;
}

/** Solo lee el estado actual — no cuenta como intento. */
export function getRateLimitStatus(key: string, max: number, windowMs: number): RateLimitStatus {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) return { limited: false, retryAfterMs: 0 };
  if (bucket.count < max) return { limited: false, retryAfterMs: 0 };
  return { limited: true, retryAfterMs: windowMs - (now - bucket.windowStart) };
}

/** Registra un intento (fallido, o el evento a limitar) y devuelve si ya se pasó del límite. */
export function recordAttempt(key: string, max: number, windowMs: number): RateLimitStatus {
  sweep(windowMs);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { limited: false, retryAfterMs: 0 };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return { limited: true, retryAfterMs: windowMs - (now - bucket.windowStart) };
  }
  return { limited: false, retryAfterMs: 0 };
}

/** Limpia el contador de una key (ej. tras un login exitoso). */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function formatRetryAfter(ms: number) {
  const minutes = Math.ceil(ms / 60_000);
  return minutes <= 1 ? "1 minuto" : `${minutes} minutos`;
}
