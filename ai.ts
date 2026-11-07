import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

const SYSTEM = `Você reescreve legendas de posts para Instagram e TikTok, em português do Brasil.
Mantenha o sentido e as informações da legenda original, deixe o texto mais claro e envolvente,
com uma primeira linha que prenda a atenção. Preserve as hashtags e os @ que já existirem.
Não invente fatos, promoções ou números. Responda somente com a nova legenda, sem comentários.`;

/** Reescreve uma legenda com o Claude. */
export async function rewriteCaption(caption: string, instruction?: string): Promise<string> {
  client ??= new Anthropic();
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${instruction ? `Pedido extra: ${instruction}\n\n` : ""}Legenda original:\n${caption}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("O Claude não reescreveu esta legenda.");
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("O Claude não devolveu texto.");
  return text;
}
