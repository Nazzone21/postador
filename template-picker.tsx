"use client";

import { TEMPLATES, getTemplate } from "@/lib/templates";

export function TemplatePicker({
  templateId,
  onTemplate,
  templateText,
  onText,
}: {
  templateId: string;
  onTemplate: (id: string) => void;
  templateText: string;
  onText: (v: string) => void;
}) {
  const current = getTemplate(templateId);
  return (
    <div>
      <p className="label">Modelo de edição</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <label
            key={t.id}
            className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
              t.id === templateId ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/50"
            }`}
          >
            <input
              type="radio"
              name="template"
              value={t.id}
              checked={t.id === templateId}
              onChange={() => onTemplate(t.id)}
              className="sr-only"
            />
            <span className="block font-medium">{t.name}</span>
            <span className="hint">{t.description}</span>
          </label>
        ))}
      </div>
      {current.usesText && (
        <div className="mt-3">
          <label className="label" htmlFor="templateText">Texto no vídeo</label>
          <input
            id="templateText"
            className="input"
            maxLength={300}
            value={templateText}
            onChange={(e) => onText(e.target.value)}
            placeholder="Em branco = usa a primeira linha da legenda"
          />
        </div>
      )}
    </div>
  );
}
