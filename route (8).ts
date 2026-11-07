import Anthropic from "@anthropic-ai/sdk";
import { getUser } from "@/lib/auth";
import { rewriteCaption } from "@/lib/ai";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { caption, instruction } = (await req.json().catch(() => ({}))) as { caption?: string; instruction?: string };
  if (!caption?.trim()) return Response.json({ error: "Escreva uma legenda primeiro." }, { status: 400 });
  if (caption.length > 5000) return Response.json({ error: "O texto passa de 5.000 caracteres." }, { status: 400 });

  try {
    const text = await rewriteCaption(caption, instruction?.slice(0, 300));
    return Response.json({ caption: text });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Chave da API do Claude inválida ou ausente (ANTHROPIC_API_KEY no .env)." }, { status: 500 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Limite de uso da API atingido. Tente em alguns instantes." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[ia] erro da API:", err.status, err.message);
      return Response.json({ error: `Erro da API do Claude (${err.status ?? "sem status"}).` }, { status: 502 });
    }
    const msg = (err as Error).message ?? "";
    if (/api key|apiKey|authToken|credentials/i.test(msg)) {
      return Response.json({ error: "Configure ANTHROPIC_API_KEY no .env para usar a IA." }, { status: 500 });
    }
    console.error("[ia] erro:", err);
    return Response.json({ error: msg || "Não foi possível reescrever." }, { status: 500 });
  }
}
