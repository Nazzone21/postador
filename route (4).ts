import { verifyPublicToken } from "@/lib/public-url";
import { serveFile } from "@/lib/serve";

// Arquivo público temporário (link assinado), usado pelo Instagram para baixar mídias.
export async function GET(req: Request, ctx: RouteContext<"/api/publico/[token]">) {
  const rel = verifyPublicToken((await ctx.params).token);
  if (!rel) return new Response("Link inválido ou expirado", { status: 404 });
  return serveFile(req, rel, "public, max-age=600");
}
