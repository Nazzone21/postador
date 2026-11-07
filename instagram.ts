// Integração com a API oficial do Instagram com login unificado
// (Facebook Login for Business). É a configuração que a Meta usa para apps novos.
// Docs: developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login
//
// O token recebido é um "token de usuário do sistema de integração empresarial" (SUAT):
// pertence ao portfólio empresarial do cliente, cobre todas as contas do Instagram que ele
// compartilhou e, conforme a configuração, pode não expirar.
import { readFile, stat } from "node:fs/promises";

const GRAPH = "https://graph.facebook.com";
const VERSION = process.env.META_GRAPH_VERSION ?? "v27.0";

/** O botão de login precisa do app da Meta, da configuração e de um APP_URL com HTTPS. */
export function instagramLoginConfigured(): boolean {
  return Boolean(
    process.env.META_APP_ID &&
      process.env.META_APP_SECRET &&
      process.env.META_CONFIG_ID &&
      process.env.APP_URL?.startsWith("https://"),
  );
}

export function redirectUri(): string {
  return `${process.env.APP_URL}/api/instagram/callback`;
}

/** URL do diálogo de login (Facebook Login for Business com config_id). */
export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    config_id: process.env.META_CONFIG_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    override_default_response_type: "true",
    // Sempre mostra "Continuar com o Instagram". Pelo Instagram o cliente conecta a conta
    // direto; pelo Facebook a Meta exige a conta já dentro de um portfólio empresarial.
    prompt: "login",
    state,
  });
  return `https://www.facebook.com/dialog/oauth?${params}`;
}

async function igFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body && body.error)) {
    const msg = body?.error?.message ?? body?.error_message ?? `HTTP ${res.status}`;
    throw new Error(`Instagram: ${msg}`);
  }
  return body as T;
}

const api = (path: string, params: Record<string, string>) =>
  `${GRAPH}/${VERSION}/${path}?${new URLSearchParams(params)}`;

/** Troca o código do login pelo token de acesso. */
export async function exchangeCode(code: string): Promise<string> {
  const r = await igFetch<{ access_token: string }>(
    api("oauth/access_token", {
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: redirectUri(),
      code,
    }),
  );
  return r.access_token;
}

export type InstagramAccount = { id: string; username: string };

/** Contas profissionais do Instagram que o token pode usar. */
export async function listAccounts(accessToken: string): Promise<InstagramAccount[]> {
  const r = await igFetch<{ data?: InstagramAccount[] }>(
    api("me/assigned_instagram_accounts", { fields: "id,username", limit: "100", access_token: accessToken }),
  );
  return (r.data ?? []).filter((a) => a.id);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Log = (msg: string) => Promise<void>;
export type RemoteMedia = { kind: "image" | "video"; url: string };

/**
 * Publica um Reel enviando o arquivo local por upload resumível
 * (não precisa de URL pública para o vídeo).
 */
export async function publishReel(opts: {
  igUserId: string;
  accessToken: string;
  filePath: string;
  caption: string;
  log: Log;
}) {
  const { igUserId, accessToken, filePath, caption, log } = opts;

  // 1. Cria o contêiner de mídia
  const container = await igFetch<{ id: string; uri?: string }>(`${GRAPH}/${VERSION}/${igUserId}/media`, {
    method: "POST",
    body: new URLSearchParams({
      media_type: "REELS",
      upload_type: "resumable",
      caption,
      access_token: accessToken,
    }),
  });
  await log(`Contêiner criado no Instagram (${container.id}).`);

  // 2. Envia o arquivo
  const size = (await stat(filePath)).size;
  const uploadUrl = container.uri ?? `https://rupload.facebook.com/ig-api-upload/${VERSION}/${container.id}`;
  const data = await readFile(filePath);
  const up = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${accessToken}`,
      offset: "0",
      file_size: String(size),
    },
    body: new Uint8Array(data),
  });
  if (!up.ok) throw new Error(`Instagram: falha no envio do vídeo (HTTP ${up.status}) ${await up.text()}`);
  await log(`Vídeo enviado (${(size / 1024 / 1024).toFixed(1)} MB). Aguardando o processamento do Instagram.`);

  // 3. Aguarda o processamento e 4. publica
  await waitReady(container.id, accessToken);
  return publishContainer(igUserId, accessToken, container.id);
}

async function createContainer(igUserId: string, accessToken: string, params: Record<string, string>) {
  const c = await igFetch<{ id: string }>(`${GRAPH}/${VERSION}/${igUserId}/media`, {
    method: "POST",
    body: new URLSearchParams({ ...params, access_token: accessToken }),
  });
  return c.id;
}

/** Espera o Instagram terminar de baixar/processar o contêiner (até ~10 minutos). */
async function waitReady(containerId: string, accessToken: string) {
  for (let i = 0; i < 120; i++) {
    const st = await igFetch<{ status_code?: string; status?: string }>(
      api(containerId, { fields: "status_code,status", access_token: accessToken }),
    );
    if (st.status_code === "FINISHED" || st.status_code === "PUBLISHED") return;
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED") {
      throw new Error(`Instagram recusou a mídia: ${st.status ?? st.status_code}`);
    }
    await sleep(i < 6 ? 2000 : 5000);
  }
  throw new Error("Instagram demorou demais para processar a mídia.");
}

async function publishContainer(igUserId: string, accessToken: string, containerId: string) {
  const published = await igFetch<{ id: string }>(`${GRAPH}/${VERSION}/${igUserId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: containerId, access_token: accessToken }),
  });
  let permalink: string | null = null;
  try {
    const info = await igFetch<{ permalink?: string }>(api(published.id, { fields: "permalink", access_token: accessToken }));
    permalink = info.permalink ?? null;
  } catch {
    // o link é opcional
  }
  return { externalId: published.id, permalink };
}

/** Post de imagem única no feed (a imagem precisa ser JPEG e estar em URL pública). */
export async function publishImagePost(opts: { igUserId: string; accessToken: string; imageUrl: string; caption: string; log: Log }) {
  const id = await createContainer(opts.igUserId, opts.accessToken, { image_url: opts.imageUrl, caption: opts.caption });
  await opts.log(`Contêiner da imagem criado no Instagram (${id}).`);
  await waitReady(id, opts.accessToken);
  return publishContainer(opts.igUserId, opts.accessToken, id);
}

/** Story de imagem ou vídeo. */
export async function publishStory(opts: { igUserId: string; accessToken: string; media: RemoteMedia; log: Log }) {
  const params: Record<string, string> = { media_type: "STORIES" };
  if (opts.media.kind === "image") params.image_url = opts.media.url;
  else params.video_url = opts.media.url;
  const id = await createContainer(opts.igUserId, opts.accessToken, params);
  await opts.log(`Contêiner do Story criado no Instagram (${id}).`);
  await waitReady(id, opts.accessToken);
  return publishContainer(opts.igUserId, opts.accessToken, id);
}

/** Carrossel de 2 a 10 itens (imagens e/ou vídeos). */
export async function publishCarousel(opts: {
  igUserId: string;
  accessToken: string;
  items: RemoteMedia[];
  caption: string;
  log: Log;
}) {
  const children: string[] = [];
  for (const [i, item] of opts.items.entries()) {
    const params: Record<string, string> = { is_carousel_item: "true" };
    if (item.kind === "image") params.image_url = item.url;
    else {
      params.media_type = "VIDEO";
      params.video_url = item.url;
    }
    const id = await createContainer(opts.igUserId, opts.accessToken, params);
    await waitReady(id, opts.accessToken);
    children.push(id);
    await opts.log(`Página ${i + 1} de ${opts.items.length} pronta no Instagram.`);
  }
  const parent = await createContainer(opts.igUserId, opts.accessToken, {
    media_type: "CAROUSEL",
    children: children.join(","),
    caption: opts.caption,
  });
  await waitReady(parent, opts.accessToken);
  return publishContainer(opts.igUserId, opts.accessToken, parent);
}
