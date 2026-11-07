import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { POST_CARD_INCLUDE, PostCard } from "@/components/post-card";
import { AutoRefresh } from "@/components/auto-refresh";

const TABS = [
  { id: "fila", label: "Na fila", where: { status: { in: ["SCHEDULED", "PROCESSING"] } } },
  { id: "atencao", label: "Precisa de atenção", where: { status: "FAILED" } },
  { id: "publicadas", label: "Publicadas", where: { status: "PUBLISHED" } },
  { id: "todas", label: "Todas", where: {} },
] as const;

export default async function FilaPage({ searchParams }: PageProps<"/fila">) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.aba) ?? TABS[0];

  const counts = await Promise.all(
    TABS.map((t) => db.post.count({ where: { userId: user.id, ...(t.where as Prisma.PostWhereInput) } })),
  );
  const posts = await db.post.findMany({
    where: { userId: user.id, ...(tab.where as Prisma.PostWhereInput) },
    orderBy: { scheduledAt: tab.id === "fila" ? "asc" : "desc" },
    take: 100,
    include: POST_CARD_INCLUDE,
  });

  return (
    <>
      <AutoRefresh seconds={20} />
      <PageHeader
        title="Publicações"
        subtitle="Acompanhe a fila, os horários e o resultado de cada envio. Atualiza sozinha a cada 20 segundos."
        actions={<Link href="/agendar" className="btn btn-primary">Agendar publicações</Link>}
      />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t, i) => (
          <Link
            key={t.id}
            href={`/fila?aba=${t.id}`}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              t.id === tab.id ? "border-accent font-medium text-accent-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label} <span className="ml-1 rounded-full bg-bg px-1.5 text-xs">{counts[i]}</span>
          </Link>
        ))}
      </div>
      {posts.length === 0 ? (
        <EmptyState title="Nada por aqui">
          {tab.id === "fila" ? (
            <>
              Nenhum post na fila. <Link href="/nova" className="text-accent-ink underline">Agende uma postagem</Link>.
            </>
          ) : (
            "Nenhuma publicação nesta aba."
          )}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {posts.length === 100 && <p className="hint text-center">Mostrando as 100 primeiras.</p>}
        </div>
      )}
    </>
  );
}
