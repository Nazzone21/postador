// Horários são digitados e exibidos no fuso de Brasília.
// O Brasil não tem horário de verão desde 2019, então o deslocamento é fixo.
export const TZ = "America/Sao_Paulo";
const OFFSET = "-03:00";

/** "2026-11-06" + "08:30" -> Date (UTC) */
export function localToDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${OFFSET}`);
}

/** Date -> "2026-11-06" no fuso de Brasília */
export function dateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Date -> "08:30" no fuso de Brasília */
export function timeKey(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Dia da semana (0 = domingo) no fuso de Brasília */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00${OFFSET}`).getUTCDay();
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + n);
  return dateKey(d);
}

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function todayKey(): string {
  return dateKey(new Date());
}
