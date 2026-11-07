import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { listAccounts, type InstagramAccount } from "@/lib/platforms/instagram";
import { cleanupPendingConnections } from "@/lib/pending";
import { EmptyState, PageHeader } from "@/components/ui";
import { cancelPending, chooseInstagramAccount } from "../instagram-actions";

// Escolha de qual conta do Instagram fica ligada à página.
export default async function EscolherInstagramPage({ searchParams }: PageProps<"/paginas/instagram">) {
  const user = await requireUser();
  const sp = await searchParams;
  const pendingId = typeof sp.pendente === "string" ? sp.pendente : "";

  await cleanupPendingConnections();
  const pending = await db.pendingConnection.findFirst({ where: { id: pendingId, userId: user.id, platform: "instagram" } });
  const brand = pending ? await db.brand.findFirst({ where: { id: pending.brandId, userId: user.id } }) : null;

  if (!pending || !brand) {
    return (
      <>
        <PageHeader title="Conectar Instagram" />
        <EmptyState title="Essa conexão expirou">
          Volte para <Link href="/paginas" className="text-accent-ink underline">Páginas e contas</Link> e conecte de novo.
        </EmptyState>
      </>
    );
  }

  let accounts: InstagramAccount[] = [];
  let error: string | null = null;
  try {
    accounts = await listAccounts(decrypt(pending.tokenEnc));
  } catch (err) {
    error = (err as Error).message;
  }
  const used = await db.socialAccount.findMany({
    where: { userId: user.id, platform: "instagram", externalId: { in: accounts.map((a) => a.id) } },
    include: { brand: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader
        title="Escolha a conta do Instagram"
        subtitle={`Qual conta vai ficar ligada à página "${brand.name}" (@${brand.handle})?`}
      />
      {error ? (
        <p className="rounded-xl bg-err-soft px-4 py-3 text-sm text-err">{error}</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => {
            const other = used.find((u) => u.externalId === a.id && u.brandId !== brand.id);
            return (
              <div key={a.id} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">@{a.username}</p>
                  {other && <p className="hint">Já está ligada à página &quot;{other.brand.name}&quot;.</p>}
                </div>
                <form action={chooseInstagramAccount.bind(null, pending.id, a.id)}>
                  <button className="btn btn-primary px-4 py-1.5 text-xs">Usar esta conta</button>
                </form>
              </div>
            );
          })}
        </div>
      )}
      <form action={cancelPending.bind(null, pending.id)} className="mt-6">
        <button className="btn btn-ghost text-xs">Cancelar</button>
      </form>
    </>
  );
}
