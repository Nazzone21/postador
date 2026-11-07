import { deletePost, retryPost } from "@/app/(app)/fila/actions";
import { TYPE_LABEL } from "@/lib/formats";
import { getTemplate } from "@/lib/templates";
import { formatDateTime, timeKey } from "@/lib/time";
import { MediaThumb } from "./media-thumb";
import { PLATFORM_LABEL, StatusBadge } from "./ui";

export type PostWithRelations = {
  id: string;
  type: string;
  status: string;
  caption: string;
  title: string;
  templateId: string;
  scheduledAt: Date;
  publishedAt: Date | null;
  permalink: string | null;
  error: string | null;
  attempts: number;
  account: { username: string; platform: string };
  media: { path: string; kind: string; originalName: string };
  renderedPath: string | null;
  events: { id: string; at: Date; message: string; level: string }[];
  _count: { items: number };
};

/** Consulta padrão para carregar posts no formato do PostCard. */
export const POST_CARD_INCLUDE = {
  account: { select: { username: true, platform: true } },
  media: { select: { path: true, kind: true, originalName: true } },
  events: { orderBy: { at: "asc" as const } },
  _count: { select: { items: true } },
};

export function PostCard({ post }: { post: PostWithRelations }) {
  const thumbPath = post.type === "REEL" && post.renderedPath ? post.renderedPath : post.media.path;
  const details =
    post.type === "REEL"
      ? getTemplate(post.templateId).name
      : post.type === "CAROUSEL"
        ? `${post._count.items} páginas`
        : null;
  const text = post.type === "YOUTUBE" ? post.title : post.caption;

  return (
    <article className="card flex gap-4 p-4">
      <div className="relative shrink-0">
        <MediaThumb path={thumbPath} kind={post.media.kind} className="aspect-[9/16] w-16 rounded-lg sm:w-20" />
        {post.type === "CAROUSEL" && (
          <span className="absolute top-1 right-1 rounded bg-black/70 px-1 text-[10px] text-white">1/{post._count.items}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">@{post.account.username}</span>
          <span className="hint">· {PLATFORM_LABEL[post.account.platform] ?? post.account.platform}</span>
          <span className="rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-muted">{TYPE_LABEL[post.type] ?? post.type}</span>
          <StatusBadge status={post.status} />
        </div>
        <p className="hint mt-0.5">
          {post.status === "PUBLISHED" && post.publishedAt
            ? `Publicado em ${formatDateTime(post.publishedAt)}`
            : `Programado para ${formatDateTime(post.scheduledAt)} · Brasília`}
          {details ? ` · ${details}` : ""}
        </p>
        {text && <p className="mt-2 line-clamp-2 text-sm text-ink/80">{text}</p>}
        {post.status === "FAILED" && post.error && (
          <p className="mt-2 rounded-lg bg-err-soft px-2 py-1 text-xs text-err">{post.error}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {post.permalink && (
            <a href={post.permalink} target="_blank" rel="noreferrer" className="font-medium text-accent-ink hover:underline">
              Abrir publicação
            </a>
          )}
          {post.status === "FAILED" && (
            <form action={retryPost.bind(null, post.id)}>
              <button className="font-medium text-accent-ink hover:underline">Tentar de novo</button>
            </form>
          )}
          {(post.status === "SCHEDULED" || post.status === "FAILED") && (
            <form action={deletePost.bind(null, post.id)}>
              <button className="text-err hover:underline">
                {post.status === "SCHEDULED" ? "Excluir agendamento" : "Excluir"}
              </button>
            </form>
          )}
          {post.events.length > 0 && (
            <details className="w-full">
              <summary className="cursor-pointer text-muted hover:text-ink">Ver etapas deste envio</summary>
              <ol className="mt-2 space-y-1 border-l border-line pl-3">
                {post.events.map((e) => (
                  <li key={e.id} className={e.level === "error" ? "text-err" : "text-muted"}>
                    <span className="tabular-nums">{timeKey(e.at)}</span> · {e.message}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}
