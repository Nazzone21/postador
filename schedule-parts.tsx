"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import type { ScheduleResult } from "@/app/(app)/agendar-actions";
import type { MediaAccept } from "@/lib/formats";
import { MediaThumb } from "./media-thumb";
import type { AccountOption, MediaOption } from "./single-post-form";
import { Uploader } from "./uploader";
import { PLATFORM_LABEL } from "./ui";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function AccountPicker({
  accounts,
  selected,
  onChange,
  multiple = true,
  hint,
}: {
  accounts: AccountOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  hint?: string;
}) {
  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <p className="label mb-0">Onde publicar</p>
        {multiple && <span className="hint">{selected.length} de {accounts.length} contas</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => (
          <label key={a.id} className="chip">
            <input
              type={multiple ? "checkbox" : "radio"}
              className="sr-only"
              checked={selected.includes(a.id)}
              onChange={() => onChange(multiple ? toggle(selected, a.id) : [a.id])}
            />
            @{a.username}
            <span className="text-xs opacity-70">· {PLATFORM_LABEL[a.platform] ?? a.platform}</span>
          </label>
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </section>
  );
}

export function MediaPicker({
  media,
  setMedia,
  selected,
  onChange,
  accept,
  max,
  multiple = true,
  title,
  hint,
}: {
  media: MediaOption[];
  setMedia: (fn: (prev: MediaOption[]) => MediaOption[]) => void;
  selected: string[];
  onChange: (ids: string[]) => void;
  accept: MediaAccept;
  max: number;
  multiple?: boolean;
  title: string;
  hint?: string;
}) {
  const select = (id: string) => {
    if (!multiple) return onChange([id]);
    if (selected.includes(id)) return onChange(selected.filter((x) => x !== id));
    if (selected.length >= max) return;
    onChange([...selected, id]);
  };
  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="label mb-0">{title}</p>
        <div className="flex items-center gap-3">
          {multiple && <span className="hint">{selected.length} selecionados (até {max})</span>}
          {multiple && media.length > 0 && (
            <button
              type="button"
              className="text-xs text-accent-ink hover:underline"
              onClick={() => onChange(selected.length ? [] : media.slice(0, max).map((m) => m.id))}
            >
              {selected.length ? "Limpar" : "Selecionar todos"}
            </button>
          )}
        </div>
      </div>
      <Uploader
        compact
        multiple={multiple}
        accept={accept}
        onUploaded={(m) => {
          setMedia((prev) => [m, ...prev]);
          if (!multiple) onChange([m.id]);
          else onChange([...selected, m.id].slice(0, max));
        }}
      />
      {media.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {media.map((m) => {
            const idx = selected.indexOf(m.id);
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => select(m.id)}
                title={m.originalName}
                className={`relative overflow-hidden rounded-xl border-2 ${idx >= 0 ? "border-accent" : "border-transparent"}`}
              >
                <MediaThumb path={m.path} kind={m.kind} className="aspect-[9/16] w-full" />
                {m.kind === "video" && (
                  <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] text-white">vídeo</span>
                )}
                {idx >= 0 && multiple && (
                  <span className="absolute top-1 left-1 rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{idx + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {hint && <p className="hint">{hint}</p>}
    </section>
  );
}

export function useSlotRules(defaultDate: string) {
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [times, setTimes] = useState<string[]>(["08:00", "12:00", "18:00"]);
  const [startDate, setStartDate] = useState(defaultDate);
  return { weekdays, setWeekdays, times, setTimes, startDate, setStartDate };
}

export function SlotRules({
  rules,
  noun,
}: {
  rules: ReturnType<typeof useSlotRules>;
  noun: string;
}) {
  const [newTime, setNewTime] = useState("21:00");
  const { weekdays, setWeekdays, times, setTimes, startDate, setStartDate } = rules;
  return (
    <section className="card space-y-4 p-5">
      <div>
        <p className="label">Dias da semana</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d, i) => (
            <label key={d} className="chip">
              <input type="checkbox" className="sr-only" checked={weekdays.includes(i)} onChange={() => setWeekdays((l) => toggle(l, i))} />
              {d}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Horários (Brasília)</p>
        <div className="flex flex-wrap items-center gap-2">
          {[...times].sort().map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1 text-sm text-accent-ink">
              {t}
              <button type="button" aria-label={`Remover ${t}`} onClick={() => setTimes((l) => l.filter((x) => x !== t))} className="ml-1 opacity-70 hover:opacity-100">
                ×
              </button>
            </span>
          ))}
          <input type="time" className="input w-28" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => newTime && !times.includes(newTime) && setTimes((l) => [...l, newTime])}
          >
            + Adicionar horário
          </button>
        </div>
      </div>
      <div className="max-w-xs">
        <label className="label" htmlFor="start">Data de início</label>
        <input id="start" type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <p className="hint">
        {noun} ocupam os próximos horários livres de cada conta, a partir da data de início. Horários já ocupados são pulados.
      </p>
    </section>
  );
}

export function DateTimeFields({
  date,
  setDate,
  time,
  setTime,
}: {
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
}) {
  return (
    <section className="card grid gap-4 p-5 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="date">Data</label>
        <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="time">Hora (Brasília)</label>
        <input id="time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
    </section>
  );
}

/** Prévia simples de uma mídia (imagem ou vídeo) na proporção do formato. */
export function MediaPreview({ item, aspect, label }: { item: MediaOption | null; aspect: "4/5" | "9/16" | "16/9"; label?: string }) {
  const style = { aspectRatio: aspect.replace("/", " / ") };
  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-black" style={style}>
      {item ? (
        item.kind === "image" ? (
          <img src={`/api/media/${item.path}`} alt="" className="h-full w-full object-cover" />
        ) : (
          <video key={item.path} src={`/api/media/${item.path}`} muted autoPlay loop playsInline className="h-full w-full object-cover" />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#5b7cff] to-[#2440d8] text-sm text-white/90">
          {label ?? "sua mídia"}
        </div>
      )}
    </div>
  );
}

export function ResultMessage({ result, success }: { result: ScheduleResult | null; success: (r: Extract<ScheduleResult, { ok: true }>) => string }) {
  if (!result) return null;
  if (!result.ok) return <p className="text-sm text-err">{result.error}</p>;
  return (
    <p className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
      {success(result)} <Link href="/calendario" className="underline">Ver no calendário</Link>
    </p>
  );
}
