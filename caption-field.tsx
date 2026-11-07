"use client";

import { useState } from "react";

export function CaptionField({
  value,
  onChange,
  id,
  rows = 5,
  label = "Legenda",
  maxLength = 2200,
  placeholder = "Escreva a legenda, hashtags e chamada para ação.",
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
  rows?: number;
  label?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);

  async function rewrite() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/legenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: value }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Não foi possível reescrever.");
      setPrevious(value);
      onChange(body.caption);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="label mb-0" htmlFor={id}>{label}</label>
        <div className="flex items-center gap-3">
          {previous !== null && (
            <button
              type="button"
              className="text-xs text-muted hover:text-ink"
              onClick={() => {
                onChange(previous);
                setPrevious(null);
              }}
            >
              Desfazer
            </button>
          )}
          <button
            type="button"
            onClick={rewrite}
            disabled={busy || !value.trim()}
            className="text-xs font-medium text-accent-ink hover:underline disabled:opacity-40 disabled:no-underline"
          >
            {busy ? "Reescrevendo…" : "Reescrever com IA"}
          </button>
        </div>
      </div>
      <textarea
        id={id}
        className="input resize-y"
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <div className="mt-1 flex justify-between">
        <span className="text-xs text-err">{error}</span>
        <span className="hint">{value.length}/{maxLength}</span>
      </div>
    </div>
  );
}
