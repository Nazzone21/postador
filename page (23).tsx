import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { FORMATS } from "@/lib/formats";
import { FormatIcon } from "@/components/format-icon";
import { PageHeader } from "@/components/ui";

export default async function AgendarPage() {
  await requireUser();
  return (
    <>
      <PageHeader
        title="Agendar publicações"
        subtitle="Escolha o formato. As contas conectadas e o acompanhamento ficam no mesmo lugar para todas as redes."
      />
      <h2 className="mb-1 text-lg font-semibold">O que você quer agendar?</h2>
      <p className="mb-5 text-sm text-muted">Escolha o formato para preparar suas publicações.</p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {FORMATS.map((f) => (
          <Link
            key={f.id}
            href={`/agendar/${f.id}`}
            className="card group flex flex-col p-6 transition-colors hover:border-accent/50 hover:bg-surface-2"
          >
            <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft text-accent-ink">
              <FormatIcon id={f.id} />
            </span>
            <span className="text-lg font-bold">{f.name}</span>
            <span className="mt-2 text-sm leading-relaxed text-muted">{f.description}</span>
            <span className="mt-4 text-xs text-muted/80">{f.networks}</span>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink">
              Começar
              <span className="transition-transform group-hover:translate-x-1" aria-hidden>→</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="hint mt-6">
        Quer só um Reel rápido? Use a <Link href="/nova" className="text-accent-ink hover:underline">nova postagem</Link>.
      </p>
    </>
  );
}
