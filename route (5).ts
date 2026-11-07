import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { serveFile } from "@/lib/serve";

// Serve arquivos do armazenamento para o usuário logado (só os dele).
export async function GET(req: Request, ctx: RouteContext<"/api/media/[...path]">) {
  const user = await getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const rel = (await ctx.params).path.join("/");
  const counts = await Promise.all([
    db.media.count({ where: { userId: user.id, path: rel } }),
    db.brand.count({ where: { userId: user.id, avatarPath: rel } }),
    db.post.count({ where: { userId: user.id, renderedPath: rel } }),
    db.postItem.count({ where: { renderedPath: rel, post: { userId: user.id } } }),
  ]);
  if (counts.every((c) => c === 0)) return new Response("Não encontrado", { status: 404 });
  return serveFile(req, rel);
}
