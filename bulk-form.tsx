"use client";

import { useState, useTransition } from "react";
import { createBulk, type ScheduleResult } from "@/app/(app)/agendar-actions";
import { CaptionField } from "./caption-field";
import { AccountPicker, MediaPicker, MediaPreview, ResultMessage, SlotRules, useSlotRules } from "./schedule-parts";
import type { AccountOption, MediaOption } from "./single-post-form";
import { TemplatePicker } from "./template-picker";
import { TemplatePreview } from "./template-preview";

type BulkFormat = "posts" | "reels" | "stories";

const CONFIG = {
  posts: { accept: "image", noun: "As imagens", item: "imagem", items: "imagens", caption: true, template: false, aspect: "4/5" },
  reels: { accept: "video", noun: "Os vídeos", item: "vídeo", items: "vídeos", caption: true, template: true, aspect: "9/16" },
  stories: { accept: "both", noun: "Os Stories", item: "story", items: "imagens ou vídeos", caption: false, template: false, aspect: "9/16" },
} as const;

/** Agendamento em lote: posts de imagem, Reels ou Stories distribuídos em horários fixos. */
export function BulkForm({
  format,
  accounts,
  media: initialMedia,
  defaultDate,
}: {
  format: BulkFormat;
  accounts: AccountOption[];
  media: MediaOption[];
  defaultDate: string;
}) {
  const cfg = CONFIG[format];
  const [media, setMedia] = useState(initialMedia);
  const [accountIds, setAccountIds] = useState<string[]>(accounts[0] ? [accounts[0].id] : []);
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("original");
  const [templateText, setTemplateText] = useState("");
  const [captionMode, setCaptionMode] = useState<"one" | "each">("one");
  const [caption, setCaption] = useState("");
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const rules = useSlotRules(defaultDate);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [pending, startTransition] = useTransition();

  const firstAccount = accounts.find((a) => a.id === accountIds[0]) ?? null;
  const selectedMedia = mediaIds.map((id) => media.find((m) => m.id === id)).filter((m): m is MediaOption => !!m);
  const first = selectedMedia[0] ?? null;
  const total = accountIds.length * mediaIds.length;

  function submit() {
    startTransition(async () => {
      const r = await createBulk({
        format,
        accountIds,
        mediaIds,
        captionMode,
        caption: cfg.caption ? caption : "",
        captions: cfg.caption ? captions : {},
        templateId: cfg.template ? templateId : "original",
        templateText: cfg.template ? templateText : "",
        weekdays: rules.weekdays,
        times: rules.times,
        startDate: rules.startDate,
      });
      setResult(r);
      if (r.ok) {
        setMediaIds([]);
        setCaptions({});
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
          hint="Cada conta escolhida recebe todas as publicações do lote, cada uma no seu horário."
        />

        <MediaPicker
          media={media}
          setMedia={setMedia}
          selected={mediaIds}
          onChange={setMediaIds}
          accept={cfg.accept}
          max={150}
          title={`${cfg.items[0].toUpperCase()}${cfg.items.slice(1)} do lote`}
          hint={
            format === "posts"
              ? "A ordem dos números é a ordem de publicação. O Instagram aceita imagens entre 4:5 (retrato) e 1,91:1 (paisagem)."
              : "A ordem dos números é a ordem de publicação."
          }
        />

        {cfg.template && (
          <section className="card p-5">
            <TemplatePicker templateId={templateId} onTemplate={setTemplateId} templateText={templateText} onText={setTemplateText} />
          </section>
        )}

        {cfg.caption ? (
          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap gap-2">
              <label className="chip">
                <input type="radio" className="sr-only" checked={captionMode === "one"} onChange={() => setCaptionMode("one")} />
                Uma legenda para todos
              </label>
              <label className="chip">
                <input type="radio" className="sr-only" checked={captionMode === "each"} onChange={() => setCaptionMode("each")} />
                Uma legenda por {cfg.item}
              </label>
            </div>
            {captionMode === "one" ? (
              <CaptionField id="caption" value={caption} onChange={setCaption} />
            ) : selectedMedia.length === 0 ? (
              <p className="hint">Selecione os arquivos para escrever as legendas.</p>
            ) : (
              selectedMedia.map((m, i) => (
                <CaptionField
                  key={m.id}
                  id={`caption-${m.id}`}
                  rows={3}
                  label={`${i + 1}. ${m.originalName}`}
                  value={captions[m.id] ?? ""}
                  onChange={(v) => setCaptions((c) => ({ ...c, [m.id]: v }))}
                />
              ))
            )}
          </section>
        ) : (
          <section className="card p-5">
            <p className="text-sm text-muted">Stories não têm legenda. Imagens ficam 5 segundos na tela; vídeos, até 60 segundos.</p>
          </section>
        )}

        <SlotRules rules={rules} noun={cfg.noun} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        {cfg.template ? (
          <TemplatePreview
            templateId={templateId}
            templateText={templateText}
            caption={captionMode === "one" ? caption : captions[first?.id ?? ""] ?? ""}
            videoPath={first?.path ?? null}
            brand={firstAccount?.brand ?? null}
          />
        ) : (
          <MediaPreview item={first} aspect={cfg.aspect} />
        )}
        <div className="card space-y-1 p-4 text-sm">
          <p><span className="text-muted">Arquivos:</span> {mediaIds.length}</p>
          <p><span className="text-muted">Contas:</span> {accountIds.length}</p>
          <p>
            <span className="text-muted">Dias ativos:</span> {rules.weekdays.length} · <span className="text-muted">Horários:</span> {rules.times.length}
          </p>
          <p className="font-semibold">Total: {total} publicações</p>
        </div>
        <button className="btn btn-primary w-full" onClick={submit} disabled={pending || total === 0}>
          {pending ? "Agendando…" : `Agendar ${total || ""} publicações`}
        </button>
        <ResultMessage result={result} success={(r) => `${r.created} publicações agendadas, de ${r.first} até ${r.last}.`} />
      </aside>
    </div>
  );
}
