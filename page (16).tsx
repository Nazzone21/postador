import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { instagramLoginConfigured } from "@/lib/platforms/instagram";
import { youtubeConfigured } from "@/lib/platforms/youtube";
import { EmptyState, PageHeader } from "@/components/ui";
import { BrandAvatar } from "@/components/brand-avatar";
import { addSimulatedAccount, deleteBrand, disconnectAccount } from "./actions";
import { BrandForm } from "./brand-form";
import { InstagramTokenForm } from "./instagram-token-form";

const MESSAGES: Record<string, { text: string; error?: boolean }> = {
  instagram: { text: "Instagram conectado." },
  "ig-config": {
    text: "O botão de login precisa de META_APP_ID, META_APP_SECRET, META_CONFIG_ID e um APP_URL com HTTPS no .env.",
    error: true,
  },
  "ig-state": { text: "A conexão expirou. Tente conectar de novo.", error: true },
  "ig-denied": { text: "A conexão com o Instagram foi cancelada.", error: true },
  "ig-error": { text: "Não foi possível conectar o Instagram. Tente de novo.", error: true },
  "ig-none": {
    text: "Nenhuma conta do Instagram foi liberada. Conecte de novo, escolha “Continuar com o Instagram” e entre com a conta profissional.",
    error: true,
  },
  youtube: { text: "YouTube conectado." },
  "yt-config": { text: "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e APP_URL no .env para conectar o YouTube.", error: true },
  "yt-state": { text: "A conexão expirou. Tente conectar de novo.", error: true },
  "yt-denied": { text: "A conexão com o YouTube foi cancelada.", error: true },
  "yt-error": { text: "Não foi possível conectar o YouTube. Tente de novo.", error: true },
};

type Account = { id: string; platform: string; username: string };

const NETWORK_STYLE: Record<string, { label: string; dot: string; connectedText: string }> = {
  instagram: { label: "Instagram", dot: "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]", connectedText: "API oficial do Instagram" },
  youtube: { label: "YouTube", dot: "bg-[#ff0000]", connectedText: "API oficial do YouTube" },
};

/** Uma linha por rede: nome, status e ações (conectar, reconectar, desconectar). */
function NetworkRow({
  platform,
  account,
  connectHref,
  ready,
  missingConfig,
  extra,
}: {
  platform: "instagram" | "youtube";
  account: Account | undefined;
  connectHref: string;
  ready: boolean;
  missingConfig: string;
  extra?: React.ReactNode;
}) {
  const s = NETWORK_STYLE[platform];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`h-8 w-8 shrink-0 rounded-lg ${s.dot}`} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{account ? `@${account.username}` : s.label}</p>
          <p className="hint truncate">
            {account ? `Conectado pela ${s.connectedText}` : ready ? "Não conectado" : missingConfig}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {account ? (
          <>
            {ready && (
              <a href={connectHref} className="btn btn-ghost px-3 py-1.5 text-xs">
                Reconectar
              </a>
            )}
            <form action={disconnectAccount.bind(null, account.id)}>
              <button className="btn btn-ghost px-3 py-1.5 text-xs">Desconectar</button>
            </form>
          </>
        ) : (
          <>
            <a
              href={connectHref}
              className={`btn btn-primary px-4 py-1.5 text-xs ${ready ? "" : "pointer-events-none opacity-40"}`}
              aria-disabled={!ready}
            >
              Conectar {s.label}
            </a>
            {extra}
          </>
        )}
      </div>
    </div>
  );
}

export default async function PaginasPage({ searchParams }: PageProps<"/paginas">) {
  const user = await requireUser();
  const sp = await searchParams;
  const msg = MESSAGES[String(sp.msg ?? "")];
  const brands = await db.brand.findMany({
    where: { userId: user.id },
    include: { accounts: true },
    orderBy: { createdAt: "asc" },
  });
  const igReady = instagramLoginConfigured();
  const ytReady = youtubeConfigured();

  return (
    <>
      <PageHeader
        title="Páginas e contas"
        subtitle="Reúna as redes da mesma marca numa página. Cada página tem um Instagram e um YouTube (TikTok e Facebook em breve)."
      />

      {msg && (
        <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.error ? "bg-err-soft text-err" : "bg-ok-soft text-ok"}`}>
          {msg.text}
        </p>
      )}

      <BrandForm />

      <div className="mt-6 space-y-4">
        {brands.length === 0 && (
          <EmptyState title="Nenhuma página ainda">
            Crie sua primeira página acima. Depois conecte o Instagram e o YouTube dela.
          </EmptyState>
        )}

        {brands.map((brand) => {
          const ig = brand.accounts.find((a) => a.platform === "instagram");
          const yt = brand.accounts.find((a) => a.platform === "youtube");
          const sim = brand.accounts.find((a) => a.platform === "simulado");
          const connected = [ig, yt].filter(Boolean).length;
          return (
            <section key={brand.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BrandAvatar name={brand.name} avatarPath={brand.avatarPath} size={44} />
                  <div>
                    <p className="font-semibold">{brand.name}</p>
                    <p className="text-sm text-muted">
                      @{brand.handle} · {connected} de 2 redes conectadas
                    </p>
                  </div>
                </div>
                <form action={deleteBrand.bind(null, brand.id)}>
                  <button className="btn btn-danger px-3 py-1.5 text-xs">Excluir página</button>
                </form>
              </div>

              <div className="mt-4 space-y-2">
                <NetworkRow
                  platform="instagram"
                  account={ig}
                  connectHref={`/api/instagram/connect?brand=${brand.id}`}
                  ready={igReady}
                  missingConfig="Login da Meta ainda não configurado neste servidor."
                  extra={igReady ? null : <InstagramTokenForm brandId={brand.id} />}
                />
                <NetworkRow
                  platform="youtube"
                  account={yt}
                  connectHref={`/api/youtube/connect?brand=${brand.id}`}
                  ready={ytReady}
                  missingConfig="Login do Google ainda não configurado neste servidor."
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="chip pointer-events-none opacity-50">Conectar TikTok · em breve</span>
                <span className="chip pointer-events-none opacity-50">Conectar Facebook · em breve</span>
                {sim ? (
                  <form action={disconnectAccount.bind(null, sim.id)}>
                    <button className="chip">Conta de teste ativa · remover</button>
                  </form>
                ) : (
                  <form action={addSimulatedAccount.bind(null, brand.id)}>
                    <button className="chip">+ Conta de teste</button>
                  </form>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="card mt-6 p-5">
        <h2 className="font-semibold">Antes de conectar</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>
            <span className="font-medium text-ink">Instagram:</span> a conta precisa ser profissional (Comercial ou Criador
            de conteúdo). Na tela da Meta, clique em <span className="text-ink">“Continuar com o Instagram”</span> e entre com
            ela.
          </li>
          <li>
            <span className="font-medium text-ink">YouTube:</span> entre com a conta Google que tem o canal.
          </li>
          <li>
            A autorização é feita direto com cada rede, pela integração oficial. Você não precisa criar nenhum app, e é só
            uma vez: depois a conta fica conectada.
          </li>
        </ul>
      </section>
    </>
  );
}
