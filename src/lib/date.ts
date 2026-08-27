/**
 * Fechas siempre formateadas en la zona horaria del negocio (Perú), con
 * timeZone explícito — sin esto, un Client Component que formatea fechas en
 * el render produce un mismatch de hidratación (el servidor y el navegador
 * pueden tener zonas horarias por defecto distintas) y React lanza el error #418.
 */
const TIME_ZONE = "America/Lima";

export function formatDateTime(date: Date) {
  return date.toLocaleString("es-PE", { timeZone: TIME_ZONE });
}

export function formatDateShort(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return date.toLocaleDateString("es-PE", { timeZone: TIME_ZONE, ...options });
}

/**
 * Medianoche del día (en hora de Lima) que contiene `date`, como instante UTC.
 * Perú no tiene horario de verano — el offset UTC-5 es fijo todo el año, así
 * que calcularlo a mano aquí es seguro y evita depender de la zona horaria
 * del servidor al calcular "hoy/esta semana/este mes" para el dashboard.
 */
export function startOfDayLima(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = fmt.formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  return new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0)); // 00:00 Lima = 05:00 UTC
}
