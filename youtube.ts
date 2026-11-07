// Integração com a API oficial do YouTube (YouTube Data API v3) via login do Google.
// Requer um projeto no Google Cloud com a YouTube Data API ativada e um cliente OAuth
// do tipo "Aplicativo da Web".
import { readFile, stat } from "node:fs/promises";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

export function youtubeConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.APP_URL);
}

export function redirectUri(): string {
  return `${process.env.APP_URL}/api/youtube/callback`;
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function gFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message ?? body?.error_description ?? body?.error ?? `HTTP ${res.status}`;
    throw new Error(`YouTube: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
  }
  return body as T;
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string };

export async function exchangeCode(code: string) {
  const tokens = await gFetch<TokenResponse>("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokens.refresh_token) throw new Error("YouTube: o Google não devolveu o token de renovação. Tente conectar de novo.");
  const channels = await gFetch<{
    items?: { id: string; snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url: string } } } }[];
  }>("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const channel = channels.items?.[0];
  if (!channel) throw new Error("YouTube: esta conta Google não tem um canal.");
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    channelId: channel.id,
    username: (channel.snippet.customUrl ?? channel.snippet.title).replace(/^@/, ""),
    pictureUrl: channel.snippet.thumbnails?.default?.url ?? null,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const t = await gFetch<TokenResponse>("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return { accessToken: t.access_token, expiresAt: new Date(Date.now() + t.expires_in * 1000) };
}

/** Envia o vídeo por upload resumível e publica com o título, descrição e privacidade. */
export async function uploadVideo(opts: {
  accessToken: string;
  filePath: string;
  title: string;
  description: string;
  privacy: string;
  log: (msg: string) => Promise<void>;
}) {
  const size = (await stat(opts.filePath)).size;
  const metadata = {
    snippet: { title: opts.title, description: opts.description, categoryId: "22" },
    status: { privacyStatus: opts.privacy, selfDeclaredMadeForKids: false },
  };

  // 1. Abre a sessão de upload
  const start = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(size),
        "X-Upload-Content-Type": "video/*",
      },
      body: JSON.stringify(metadata),
    },
  );
  const location = start.headers.get("location");
  if (!start.ok || !location) {
    const body = await start.json().catch(() => ({}));
    throw new Error(`YouTube: não foi possível iniciar o envio (${body?.error?.message ?? `HTTP ${start.status}`}).`);
  }
  await opts.log(`Enviando o vídeo para o YouTube (${(size / 1024 / 1024).toFixed(1)} MB)…`);

  // 2. Envia o arquivo
  const data = await readFile(opts.filePath);
  const video = await gFetch<{ id: string }>(location, {
    method: "PUT",
    headers: { "Content-Type": "video/*", "Content-Length": String(size) },
    body: new Uint8Array(data),
  });
  return { externalId: video.id, permalink: `https://www.youtube.com/watch?v=${video.id}` };
}
