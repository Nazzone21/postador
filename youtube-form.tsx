"use client";

import { useState, useTransition } from "react";
import { createYoutube, type ScheduleResult } from "@/app/(app)/agendar-actions";
import { CaptionField } from "./caption-field";
import { AccountPicker, DateTimeFields, MediaPicker, MediaPreview, ResultMessage } from "./schedule-parts";
import type { AccountOption, MediaOption } from "./single-post-form";

const PRIVACY = [
  { id: "public", label: "Público" },
  { id: "unlisted", label: "Não listado" },
  { id: "private", label: "Privado" },
] as const;

/** YouTube: um vídeo por agendamento, com título, descrição e privacidade. */
export function YoutubeForm({
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<(typeof PRIVACY)[number]["id"]>("public");
  const [isShort, setIsShort] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("12:00");
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [pending, startTransition] = useTransition();

  const video = media.find((m) => m.id === mediaIds[0]) ?? null;
  const ready = accountIds.length > 0 && !!video && title.trim().length > 0;

  function submit() {
    startTransition(async () => {
      const r = await createYoutube({
        accountId: accountIds[0],
        mediaId: mediaIds[0],
        title,
        description,
        privacy,
        isShort,
        date,
        time,
      });
      setResult(r);
      if (r.ok) {
        setMediaIds([]);
        setTitle("");
        setDescription("");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <AccountPicker accounts={accounts} selected={accountIds} onChange={setAccountIds} multiple={false} />

        <MediaPicker
          media={media}
          setMedia={setMedia}
          selected={mediaIds}
          onChange={setMediaIds}
          accept="video"
          max={1}
          multiple={false}
          title="Vídeo"
        />

        <section className="card space-y-4 p-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label mb-0" htmlFor="title">Título</label>
              <span className="hint">{title.length}/100</span>
            </div>
            <input
              id="title"
              className="input"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Um título claro, que diga do que o vídeo trata"
            />
          </div>
          <CaptionField
            id="description"
            label="Descrição"
            rows={6}
            maxLength={5000}
            value={description}
            onChange={setDescription}
            placeholder="Conte do que o vídeo trata, links e hashtags."
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="label mb-0 mr-1">Privacidade</span>
            {PRIVACY.map((p) => (
              <label key={p.id} className="chip">
                <input type="radio" className="sr-only" checked={privacy === p.id} onChange={() => setPrivacy(p.id)} />
                {p.label}
              </label>
            ))}
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-2 p-3">
            <input type="checkbox" className="mt-1 accent-[#2f5cff]" checked={isShort} onChange={(e) => setIsShort(e.target.checked)} />
            <span>
              <span className="block text-sm font-medium">Publicar como Short</span>
              <span className="hint">Para vídeos verticais de até 3 minutos. Adiciona #Shorts ao título.</span>
            </span>
          </label>
        </section>

        <DateTimeFields date={date} setDate={setDate} time={time} setTime={setTime} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <MediaPreview item={video} aspect={isShort ? "9/16" : "16/9"} label="seu vídeo" />
        <div className="card space-y-1 p-4 text-sm">
          <p className="line-clamp-2 font-semibold">{title || "Título do vídeo"}</p>
          <p><span className="text-muted">Privacidade:</span> {PRIVACY.find((p) => p.id === privacy)?.label}</p>
          <p><span className="text-muted">Publica em:</span> {date.split("-").reverse().join("/")} às {time}</p>
        </div>
        <button className="btn btn-primary w-full" onClick={submit} disabled={pending || !ready}>
          {pending ? "Agendando…" : "Agendar vídeo"}
        </button>
        <ResultMessage result={result} success={(r) => `Vídeo agendado para ${r.first}.`} />
      </aside>
    </div>
  );
}
