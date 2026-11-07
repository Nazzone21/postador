import { stat } from "node:fs/promises";
import { decrypt, encrypt } from "../crypto";
import { db } from "../db";
import { publicUrlFor } from "../public-url";
import { publishCarousel, publishImagePost, publishReel, publishStory } from "./instagram";
import { refreshAccessToken, uploadVideo } from "./youtube";

type Account = {
  id: string;
  platform: string;
  externalId: string;
  username: string;
  accessTokenEnc: string | null;
  refreshTokenEnc: string | null;
  tokenExpiresAt: Date | null;
};

/** Arquivo pronto para envio: caminho relativo no armazenamento + absoluto. */
export type ReadyFile = { rel: string; abs: string; kind: "image" | "video" };

export type PublishInput = {
  account: Account;
  type: string; // REEL | POST | CAROUSEL | STORY | YOUTUBE
  caption: string;
  title: string;
  privacy: string;
  files: ReadyFile[];
  log: (msg: string) => Promise<void>;
};

export type PublishResult = { externalId: string; permalink: string | null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Token do Instagram (login unificado). É um token de usuário do sistema do
 * portfólio empresarial; se ele parar de funcionar, a conta precisa ser reconectada.
 */
function instagramToken(account: Account): string {
  if (!account.accessTokenEnc) throw new Error("Conta sem token. Reconecte o Instagram.");
  const expires = account.tokenExpiresAt?.getTime() ?? 0;
  if (expires && expires < Date.now()) throw new Error("O acesso ao Instagram expirou. Reconecte a conta.");
  return decrypt(account.accessTokenEnc);
}

/** Token de acesso do Google, renovado com o refresh token quando estiver perto de vencer. */
async function youtubeToken(account: Account): Promise<string> {
  if (!account.refreshTokenEnc) throw new Error("Canal sem autorização. Reconecte o YouTube.");
  const expires = account.tokenExpiresAt?.getTime() ?? 0;
  if (account.accessTokenEnc && expires - Date.now() > 5 * 60 * 1000) return decrypt(account.accessTokenEnc);
  const r = await refreshAccessToken(decrypt(account.refreshTokenEnc));
  await db.socialAccount.update({
    where: { id: account.id },
    data: { accessTokenEnc: encrypt(r.accessToken), tokenExpiresAt: r.expiresAt },
  });
  return r.accessToken;
}

export async function publish(input: PublishInput): Promise<PublishResult> {
  const { account, type, files, log } = input;
  if (!files.length) throw new Error("Nenhum arquivo para publicar.");

  switch (account.platform) {
    case "simulado": {
      for (const f of files) {
        if (!(await stat(f.abs).catch(() => null))) throw new Error("Arquivo da mídia não encontrado.");
      }
      await log(`Conta de teste: simulando o envio de ${files.length > 1 ? `${files.length} arquivos` : "1 arquivo"} (nada é publicado).`);
      await sleep(1500);
      return { externalId: `sim-${Date.now()}`, permalink: null };
    }

    case "instagram": {
      const token = instagramToken(account);
      const igUserId = account.externalId;
      const remote = (f: ReadyFile) => ({ kind: f.kind, url: publicUrlFor(f.rel) });
      switch (type) {
        case "REEL":
          return publishReel({ igUserId, accessToken: token, filePath: files[0].abs, caption: input.caption, log });
        case "POST":
          return publishImagePost({ igUserId, accessToken: token, imageUrl: publicUrlFor(files[0].rel), caption: input.caption, log });
        case "STORY":
          return publishStory({ igUserId, accessToken: token, media: remote(files[0]), log });
        case "CAROUSEL":
          return publishCarousel({ igUserId, accessToken: token, items: files.map(remote), caption: input.caption, log });
        default:
          throw new Error(`O Instagram não aceita o formato ${type}.`);
      }
    }

    case "youtube": {
      if (type !== "YOUTUBE") throw new Error("Este canal só recebe publicações do formato YouTube.");
      const token = await youtubeToken(account);
      return uploadVideo({
        accessToken: token,
        filePath: files[0].abs,
        title: input.title,
        description: input.caption,
        privacy: input.privacy,
        log,
      });
    }

    default:
      throw new Error(`Rede não suportada: ${account.platform}`);
  }
}
