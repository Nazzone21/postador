import { addDays, localToDate, weekdayOf } from "./time";

/**
 * Gera os próximos horários livres a partir de uma data, respeitando
 * os dias da semana e horários escolhidos e pulando horários já ocupados.
 */
export function nextSlots(opts: {
  startDate: string; // "2026-11-06"
  weekdays: number[]; // 0 = domingo
  times: string[]; // ["08:00", "18:30"]
  count: number;
  taken: Set<number>; // timestamps já ocupados nesta conta
  notBefore?: Date;
}): Date[] {
  const times = [...new Set(opts.times)].sort();
  const weekdays = new Set(opts.weekdays);
  const notBefore = (opts.notBefore ?? new Date()).getTime();
  const out: Date[] = [];
  if (!times.length || !weekdays.size || opts.count <= 0) return out;

  let day = opts.startDate;
  for (let guard = 0; guard < 730 && out.length < opts.count; guard++) {
    if (weekdays.has(weekdayOf(day))) {
      for (const t of times) {
        const d = localToDate(day, t);
        const ts = d.getTime();
        if (ts < notBefore || opts.taken.has(ts)) continue;
        out.push(d);
        opts.taken.add(ts);
        if (out.length >= opts.count) break;
      }
    }
    day = addDays(day, 1);
  }
  return out;
}
