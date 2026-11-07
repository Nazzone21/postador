"use client";

import { useRef, useState } from "react";

export type UploadedMedia = { id: string; kind: string; path: string; originalName: string; size: number };

const ACCEPT = {
  video: { attr: ".mp4,.mov,video/mp4,video/quicktime", noun: "vídeos", hint: "MP4 ou MOV, até 300 MB cada" },
  image: { attr: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp", noun: "imagens", hint: "JPG, PNG ou WEBP, até 30 MB cada" },
  both: {
    attr: ".mp4,.mov,.jpg,.jpeg,.png,.webp,video/mp4,video/quicktime,image/jpeg,image/png,image/webp",
    noun: "imagens ou vídeos",
    hint: "JPG, PNG, WEBP, MP4 ou MOV",
  },
} as const;

function uploadOne(file: File, onProgress: (pct: number) => void): Promise<UploadedMedia> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: { error?: string } & Partial<UploadedMedia> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadedMedia);
      else reject(new Error(body.error ?? `Falha no envio (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Falha de conexão no envio."));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

export function Uploader({
  multiple = true,
  onUploaded,
  compact = false,
  accept = "video",
}: {
  multiple?: boolean;
  onUploaded: (media: UploadedMedia) => void;
  compact?: boolean;
  accept?: keyof typeof ACCEPT;
}) {
  const cfg = ACCEPT[accept];
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handle(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    setError(null);
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        const media = await uploadOne(file, (pct) =>
          setStatus(`Enviando ${i + 1} de ${list.length}: ${file.name} (${pct}%)`),
        );
        onUploaded(media);
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`);
      }
    }
    setStatus(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files);
        }}
        disabled={busy}
        className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition-colors ${
          compact ? "py-5" : "py-10"
        } ${dragging ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/60"}`}
      >
        <span className="text-sm font-medium">{busy ? status ?? "Enviando…" : `Arraste ${cfg.noun} aqui ou clique para escolher`}</span>
        <span className="hint mt-1">{cfg.hint}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={cfg.attr}
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files && handle(e.target.files)}
      />
      {error && <p className="mt-2 text-sm text-err">{error}</p>}
    </div>
  );
}
