import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateKey, localToDate, timeKey, todayKey, weekdayOf } from "@/lib/time";
import { PageHeader, STATUS_DOT, STATUS_LABEL } from "@/components/ui";
import { POST_CARD_INCLUDE, PostCard } from "@/components/post-card";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEK = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarioPage({ searchParams }: PageProps<"/calendario">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayKey();
  const ym = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : today.slice(0, 7);
  const conta = typeof sp.conta === "string" ? sp.conta : "";
  const [year, month] = ym.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = weekdayOf(`${ym}-01`);
  const selected = typeof sp.dia === "string" && sp.dia.startsWith(ym) ? sp.dia : today.startsWith(ym) ? today : `${ym}-01`;

  const accounts = await db.socialAccount.findMany({
    where: { userId: user.id },
    select: { id: true, username: true },
    orderBy: { createdAt: "asc" },
  });

  const posts = await db.post.findMany({
    where: {
      userId: user.id,
      ...(conta ? { accountId: conta } : {}),
      scheduledAt: { gte: localToDate(`${ym}-01`, "00:00"), lt: localToDate(`${shiftMonth(ym, 1)}-01`, "00:00") },
    },
    orderBy: { scheduledAt: "asc" },
    include: POST_CARD_INCLUDE,
  });

  const byDay = new Map<string, typeof posts>();
  for (const p of posts) {
    const k = dateKey(p.scheduledAt);
    byDay.set(k, [...(byDay.get(k) ?? []), p]);
  }
  const dayPosts = byDay.get(selected) ?? [];
  const q = (extra: Record<string, string>) =>
    `/calendario?${new URLSearchParams({ mes: ym, ...(conta ? { conta } : {}), ...extra })}`;

  return (
    <>
      <PageHeader
        title="Calendário"
        subtitle="Veja o mês de conteúdo e clique em um dia para ver os detalhes."
        actions={<Link href={`/nova?data=${selected}`} className="btn btn-primary">Agendar neste dia</Link>}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/calendario?mes=${shiftMonth(ym, -1)}${conta ? `&conta=${conta}` : ""}`} className="btn btn-ghost px-3" aria-label="Mês anterior">‹</Link>
          <span className="min-w-36 text-center font-medium">{MONTHS[month - 1]} {year}</span>
          <Link href={`/calendario?mes=${shiftMonth(ym, 1)}${conta ? `&conta=${conta}` : ""}`} className="btn btn-ghost px-3" aria-label="Próximo mês">›</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/calendario?mes=${ym}`} className={`chip ${!conta ? "border-accent bg-accent-soft text-accent-ink" : ""}`}>Todas</Link>
          {accounts.map((a) => (
            <Link key={a.id} href={`/calendario?mes=${ym}&conta=${a.id}`} className={`chip ${conta === a.id ? "border-accent bg-accent-soft text-accent-ink" : ""}`}>
              @{a.username}
            </Link>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-bg text-center text-xs text-muted">
          {WEEK.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`e${i}`} className="min-h-20 border-r border-b border-line bg-bg/50 sm:min-h-28" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = `${ym}-${String(i + 1).padStart(2, "0")}`;
            const list = byDay.get(day) ?? [];
            const isSel = day === selected;
            return (
              <Link
                key={day}
                href={q({ dia: day })}
                scroll={false}
                className={`min-h-20 border-r border-b border-line p-1.5 text-left transition-colors hover:bg-accent-soft/40 sm:min-h-28 ${isSel ? "bg-accent-soft/60" : ""}`}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${day === today ? "bg-accent text-white" : "text-muted"}`}>
                  {i + 1}
                </span>
                <div className="mt-1 hidden space-y-0.5 sm:block">
                  {list.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center gap-1 truncate text-[11px] leading-tight">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[p.status]}`} />
                      <span className="tabular-nums text-muted">{timeKey(p.scheduledAt)}</span>
                      <span className="truncate">@{p.account.username}</span>
                    </div>
                  ))}
                  {list.length > 3 && <div className="text-[11px] text-muted">+{list.length - 3} mais</div>}
                </div>
                {list.length > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-accent-soft px-1.5 text-[11px] text-accent-ink sm:hidden">{list.length}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[k]}`} /> {v}
          </span>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">
          {selected.split("-").reverse().join("/")} · {dayPosts.length} {dayPosts.length === 1 ? "publicação" : "publicações"}
        </h2>
        {dayPosts.length === 0 ? (
          <p className="text-sm text-muted">Nada agendado neste dia.</p>
        ) : (
          <div className="space-y-3">
            {dayPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
