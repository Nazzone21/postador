"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createPost, type ScheduleResult } from "@/app/(app)/agendar-actions";
import { CaptionField } from "./caption-field";
import { TemplatePicker } from "./template-picker";
import { TemplatePreview } from "./template-preview";
import { Uploader } from "./uploader";
import { PLATFORM_LABEL } from "./ui";

export type AccountOption = {
  id: string;
  platform: string;
  username: string;
  brand: { name: string; handle: string; avatarPath: string | null };
};
export type MediaOption = { id: string; kind: string; path: string; originalName: string };

export function SinglePostForm({
  accounts,
  media: initialMedia,
  defaultDate,
}: {
  accounts: AccountOption[];
  media: MediaOption[];
  defaultDate: string;
}) {
  const [media, setMedia] = useState(initialMedia);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [mediaId, setMediaId] = useState("");
  const [templateId, setTemplateId] = useState("original");
  const [templateText, setTemplateText] = useState("");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("12:00");
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [pending, startTransition] = useTransition();

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const video = media.find((m) => m.id === mediaId) ?? null;

  function submit() {
    startTransition(async () => {
      const r = await createPost({ accountId, mediaId, caption, templateId, templateText, date, time });
      setResult(r);
      if (r.ok) {
        setMediaId("");
        setCaption("");
        setTemplateText("");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <section className="card space-y-3 p-5">
          <p className="label">Conta</p>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <label key={a.id} className="chip">
                <input type="radio" className="sr-only" checked={a.id === accountId} onChange={() => setAccountId(a.id)} />
                @{a.username}
                <span className="text-xs opacity-70">· {PLATFORM_LABEL[a.platform] ?? a.platform}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card space-y-3 p-5">
          <p className="label">Vídeo</p>
          <Uploader
            multiple={false}
            compact
            onUploaded={(m) => {
              setMedia((prev) => [m, ...prev]);
              setMediaId(m.id);
            }}
          />
          {media.length > 0 && (
            <>
              <p className="hint">Ou escolha da biblioteca:</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {media.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setMediaId(m.id)}
                    title={m.originalName}
                    className={`relative w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                      m.id === mediaId ? "border-accent" : "border-transparent"
                    }`}
                  >
                    <video src={`/api/media/${m.path}#t=0.5`} preload="metadata" muted className="aspect-[9/16] w-full bg-black object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card p-5">
          <TemplatePicker templateId={templateId} onTemplate={setTemplateId} templateText={templateText} onText={setTemplateText} />
        </section>

        <section className="card p-5">
          <CaptionField id="caption" value={caption} onChange={setCaption} />
        </section>

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
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <TemplatePreview
          templateId={templateId}
          templateText={templateText}
          caption={caption}
          videoPath={video?.path ?? null}
          brand={account?.brand ?? null}
        />
        <div className="card space-y-1 p-4 text-sm">
          <p><span className="text-muted">Conta:</span> {account ? `@${account.username}` : "—"}</p>
          <p className="truncate"><span className="text-muted">Vídeo:</span> {video?.originalName ?? "—"}</p>
          <p><span className="text-muted">Publica em:</span> {date.split("-").reverse().join("/")} às {time}</p>
        </div>
        <button className="btn btn-primary w-full" onClick={submit} disabled={pending || !accountId || !mediaId}>
          {pending ? "Agendando…" : "Agendar post"}
        </button>
        {result && !result.ok && <p className="text-sm text-err">{result.error}</p>}
        {result?.ok && (
          <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">
            Agendado para {result.first}. <Link href="/fila" className="underline">Ver publicações</Link>
          </p>
        )}
      </aside>
    </div>
  );
}
