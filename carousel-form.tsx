"use client";

import { useState, useTransition } from "react";
import { createCarousel, type ScheduleResult } from "@/app/(app)/agendar-actions";
import { CaptionField } from "./caption-field";
import { MediaThumb } from "./media-thumb";
import { AccountPicker, DateTimeFields, MediaPicker, MediaPreview, ResultMessage } from "./schedule-parts";
import type { AccountOption, MediaOption } from "./single-post-form";

/** Carrossel: de 2 a 10 imagens/vídeos em uma única publicação. */
export function CarouselForm({
  accounts,
  media: initialMedia,
  defaultDate,
}: {
  accounts: AccountOption[];
  media: MediaOption[];
  defaultDate: string;
}) {
  const [media, setMedia] = useState(initialMedia);
  const [accountIds, setAccountIds] = useState<string[]>(accounts[0] ? [accounts[0].id] : []);
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("12:00");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [pending, startTransition] = useTransition();

  const items = mediaIds.map((id) => media.find((m) => m.id === id)).filter((m): m is MediaOption => !!m);
  const current = items[Math.min(page, Math.max(items.length - 1, 0))] ?? null;
  const ready = items.length >= 2 && accountIds.length > 0;

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= mediaIds.length) return;
    const next = [...mediaIds];
    [next[i], next[j]] = [next[j], next[i]];
    setMediaIds(next);
  }

  function submit() {
    startTransition(async () => {
      const r = await createCarousel({ accountIds, mediaIds, caption, date, time });
      setResult(r);
      if (r.ok) {
        setMediaIds([]);
        setCaption("");
        setPage(0);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <AccountPicker
          accounts={accounts}
          selected={accountIds}
          onChange={setAccountIds}
          hint="O mesmo carrossel é publicado em cada conta escolhida, no mesmo horário."
        />

        <MediaPicker
          media={media}
          setMedia={setMedia}
          selected={mediaIds}
          onChange={setMediaIds}
          accept="both"
          max={10}
          title="Páginas do carrossel"
          hint="Escolha de 2 a 10 arquivos. A primeira página é a capa."
        />

        {items.length > 0 && (
          <section className="card space-y-3 p-5">
            <p className="label mb-0">Ordem das páginas</p>
            <ol className="space-y-2">
              {items.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2">
                  <span className="w-5 text-center text-sm font-semibold text-muted">{i + 1}</span>
                  <MediaThumb path={m.path} kind={m.kind} className="h-14 w-11 rounded-lg" />
                  <span className="min-w-0 flex-1 truncate text-sm">{m.originalName}</span>
                  <div className="flex gap-1">
                    <button type="button" className="btn btn-ghost px-2.5 py-1 text-xs" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
                    <button type="button" className="btn btn-ghost px-2.5 py-1 text-xs" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Descer">↓</button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="card p-5">
          <CaptionField id="caption" value={caption} onChange={setCaption} />
        </section>

        <DateTimeFields date={date} setDate={setDate} time={time} setTime={setTime} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <MediaPreview item={current} aspect="4/5" label="capa do carrossel" />
        {items.length > 1 && (
          <div className="flex justify-center gap-1.5">
            {items.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-label={`Página ${i + 1}`}
                onClick={() => setPage(i)}
                className={`h-2 w-2 rounded-full ${i === page ? "bg-accent" : "bg-white/20"}`}
              />
            ))}
          </div>
        )}
        <div className="card space-y-1 p-4 text-sm">
          <p><span className="text-muted">Páginas:</span> {items.length} de 10</p>
          <p><span className="text-muted">Contas:</span> {accountIds.length}</p>
          <p><span className="text-muted">Publica em:</span> {date.split("-").reverse().join("/")} às {time}</p>
        </div>
        <button className="btn btn-primary w-full" onClick={submit} disabled={pending || !ready}>
          {pending ? "Agendando…" : "Agendar carrossel"}
        </button>
        {items.length === 1 && <p className="hint">Escolha pelo menos mais uma página.</p>}
        <ResultMessage result={result} success={(r) => `Carrossel agendado para ${r.first} em ${r.created} ${r.created === 1 ? "conta" : "contas"}.`} />
      </aside>
    </div>
  );
}
