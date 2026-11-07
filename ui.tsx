import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendado",
  PROCESSING: "Publicando",
  PUBLISHED: "Publicado",
  FAILED: "Falhou",
};

const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: "bg-info-soft text-info",
  PROCESSING: "bg-warn-soft text-warn",
  PUBLISHED: "bg-ok-soft text-ok",
  FAILED: "bg-err-soft text-err",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status] ?? "bg-bg text-muted"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-info",
  PROCESSING: "bg-warn",
  PUBLISHED: "bg-ok",
  FAILED: "bg-err",
};

export const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  simulado: "Teste (simulado)",
};

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}
