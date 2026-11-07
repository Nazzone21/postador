import { createHmac, timingSafeEqual } from "node:crypto";

// Links públicos temporários e assinados para um arquivo do armazenamento.
// O Instagram baixa imagens, vídeos de carrossel e Stories por URL, então
// o site precisa estar acessível na internet (APP_URL com HTTPS).

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("Defina SESSION_SECRET no .env com pelo menos 32 caracteres.");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", `public-url:${key()}`).update(payload).digest("base64url");
}

export function publicBaseUrl(): string {
  const base = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error("APP_URL não está configurado no .env.");
  }
  if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error(
      "Para publicar imagens, carrosséis e Stories, o Instagram precisa baixar o arquivo: configure APP_URL com um endereço público HTTPS (servidor ou túnel).",
    );
  }
  return base;
}

/** URL pública válida por `ttlSeconds` para o arquivo `rel`. */
export function publicUrlFor(rel: string, ttlSeconds = 2 * 3600): string {
  const payload = Buffer.from(JSON.stringify({ p: rel, e: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  const ext = rel.slice(rel.lastIndexOf("."));
  return `${publicBaseUrl()}/api/publico/${payload}.${sign(payload)}${ext}`;
}

/** Confere o token e devolve o caminho do arquivo, ou null. */
export function verifyPublicToken(token: string): string | null {
  const clean = token.replace(/\.[a-z0-9]{2,5}$/i, "");
  const [payload, sig] = clean.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { p: string; e: number };
    if (typeof data.p !== "string" || data.e < Date.now() / 1000) return null;
    return data.p;
  } catch {
    return null;
  }
}
