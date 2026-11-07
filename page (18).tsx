import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { scheduleOptions } from "@/lib/options";
import { todayKey } from "@/lib/time";
import { EmptyState, PageHeader } from "@/components/ui";
import { SinglePostForm } from "@/components/single-post-form";

export default async function NovaPage({ searchParams }: PageProps<"/nova">) {
  const user = await requireUser();
  const sp = await searchParams;
  const { accounts, media } = await scheduleOptions(user.id);
  const data = typeof sp.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : todayKey();

  return (
    <>
      <PageHeader title="Nova postagem" subtitle="Envie um Reel, escolha o modelo e quando ele deve sair." />
      {accounts.length === 0 ? (
        <EmptyState title="Nenhuma conta conectada">
          Primeiro crie uma página e conecte uma conta em{" "}
          <Link href="/paginas" className="text-accent-ink underline">Páginas e contas</Link>.
        </EmptyState>
      ) : (
        <SinglePostForm accounts={accounts} media={media} defaultDate={data} />
      )}
    </>
  );
}
