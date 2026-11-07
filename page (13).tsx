import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { MediaThumb } from "@/components/media-thumb";
import { deleteMedia } from "./actions";
import { LibraryUploader } from "./library-uploader";

function mb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const PENDING = { in: ["SCHEDULED", "PROCESSING"] };

export default async function ArquivosPage() {
  const user = await requireUser();
  const media = await db.media.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          posts: { where: { status: PENDING } },
          items: { where: { post: { status: PENDING } } },
        },
      },
    },
  });
  const total = media.reduce((s, m) => s + m.size, 0);
  const videos = media.filter((m) => m.kind === "video").length;

  return (
    <>
      <PageHeader
        title="Meus arquivos"
        subtitle={`${videos} vídeos · ${media.length - videos} imagens · ${mb(total)} usados. Envie apenas conteúdo seu ou que você tem direito de publicar.`}
      />
      <LibraryUploader />
      <div className="mt-6">
        {media.length === 0 ? (
          <EmptyState title="Nenhum arquivo na biblioteca">
            Imagens e vídeos enviados aqui ficam disponíveis em todos os formatos de agendamento.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {media.map((m) => {
              const uses = m._count.posts + m._count.items;
              return (
                <div key={m.id} className="card overflow-hidden">
                  <MediaThumb path={m.path} kind={m.kind} controls className="aspect-[9/16] w-full object-contain" />
                  <div className="p-3">
                    <p className="truncate text-sm font-medium" title={m.originalName}>{m.originalName}</p>
                    <p className="hint">
                      {m.kind === "image" ? "Imagem" : "Vídeo"} · {mb(m.size)}
                      {uses > 0 ? ` · ${uses} na fila` : ""}
                    </p>
                    {uses === 0 && (
                      <form action={deleteMedia.bind(null, m.id)} className="mt-2">
                        <button className="text-xs text-err hover:underline">Excluir</button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
