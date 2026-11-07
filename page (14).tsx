import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, dateKey, formatDateTime, localToDate, todayKey } from "@/lib/time";
import { TYPE_LABEL } from "@/lib/formats";
import { PageHeader, StatusBadge } from "@/components/ui";
import { AutoRefresh } from "@/components/auto-refresh";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date()));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default async function PainelPage() {
  const user = await requireUser();
  const where = { userId: user.id };
  const today = todayKey();
  const since = localToDate(addDays(today, -6), "00:00");

  const [queued, published, failed, accounts, upcoming, recent, recentFailed] = await Promise.all([
    db.post.count({ where: { ...where, status: { in: ["SCHEDULED", "PROCESSING"] } } }),
    db.post.count({ where: { ...where, status: "PUBLISHED" } }),
    db.post.count({ where: { ...where, status: "FAILED" } }),
    db.socialAccount.count({ where }),
    db.post.findMany({
      where: { ...where, status: { in: ["SCHEDULED", "PROCESSING"] } },
      orderBy: { scheduledAt: "asc" },
      take: 6,
      include: { account: { select: { username: true } } },
    }),
    db.post.findMany({
      where: { ...where, status: { in: ["PUBLISHED", "FAILED"] }, updatedAt: { gte: since } },
      select: { status: true, updatedAt: true },
    }),
    db.post.findMany({
      where: { ...where, status: "FAILED" },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { account: { select: { username: true } } },
    }),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const perDay = days.map((d) => ({
    day: d,
    ok: recent.filter((p) => p.status === "PUBLISHED" && dateKey(p.updatedAt) === d).length,
    fail: recent.filter((p) => p.status === "FAILED" && dateKey(p.updatedAt) === d).length,
  }));
  const max = Math.max(1, ...perDay.map((d) => d.ok + d.fail));
  const total = published + failed;
  const successRate = total ? Math.round((published / total) * 100) : null;

  const stats = [
    { label: "Na fila", value: queued, href: "/fila?aba=fila" },
    { label: "Publicadas", value: published, href: "/fila?aba=publicadas" },
    { label: "Precisam de atenção", value: failed, href: "/fila?aba=atencao" },
    { label: "Contas conectadas", value: accounts, href: "/paginas" },
  ];

  return (
    <>
      <AutoRefresh seconds={30} />
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        subtitle={successRate === null ? "Seu painel de publicações." : `Taxa de sucesso: ${successRate}% das publicações concluídas.`}
        actions={
          <>
            <Link href="/nova" className="btn btn-ghost">Nova postagem</Link>
            <Link href="/agendar" className="btn btn-primary">Agendar publicações</Link>
          </>
        }
      />

      {accounts === 0 && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-accent/40 bg-accent-soft p-5">
          <div>
            <p className="font-medium">Comece criando uma página</p>
            <p className="text-sm text-muted">Crie a página da sua marca e conecte o Instagram (ou uma conta de teste).</p>
          </div>
          <Link href="/paginas" className="btn btn-primary">Criar página</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 transition-colors hover:border-accent/50">
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Últimos 7 dias</h2>
            <div className="flex gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-ok" /> Publicadas</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-err" /> Falhas</span>
            </div>
          </div>
          <div className="flex h-40 gap-2">
            {perDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 flex-col justify-end gap-0.5" title={`${d.ok} publicadas, ${d.fail} falhas`}>
                  {d.fail > 0 && <div className="w-full rounded-sm bg-err" style={{ height: `${(d.fail / max) * 100}%` }} />}
                  {d.ok > 0 && <div className="w-full rounded-sm bg-ok" style={{ height: `${(d.ok / max) * 100}%` }} />}
                </div>
                <span className="text-[11px] text-muted">{d.day.slice(8)}/{d.day.slice(5, 7)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Próximas publicações</h2>
            <Link href="/calendario" className="text-xs text-accent-ink hover:underline">Ver calendário</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Nada na fila.</p>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{(p.type === "YOUTUBE" ? p.title : p.caption.split("\n")[0]) || "(sem legenda)"}</p>
                    <p className="hint">{TYPE_LABEL[p.type] ?? p.type} · @{p.account.username} · {formatDateTime(p.scheduledAt)}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {recentFailed.length > 0 && (
        <section className="card mt-6 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Falhas recentes</h2>
            <Link href="/fila?aba=atencao" className="text-xs text-accent-ink hover:underline">Ver todas</Link>
          </div>
          <ul className="space-y-2">
            {recentFailed.map((p) => (
              <li key={p.id} className="text-sm">
                <span className="font-medium">@{p.account.username}</span>{" "}
                <span className="text-muted">· {formatDateTime(p.scheduledAt)}</span>
                <p className="text-xs text-err">{p.error}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
