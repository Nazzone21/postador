import "server-only";
import { db } from "./db";
import { encrypt } from "./crypto";
import type { InstagramAccount } from "./platforms/instagram";

/** Liga uma conta do Instagram a uma página, guardando o token criptografado. */
export async function saveInstagramAccount(userId: string, brandId: string, token: string, account: InstagramAccount) {
  const data = {
    externalId: account.id,
    username: account.username,
    profilePictureUrl: null,
    accessTokenEnc: encrypt(token),
    refreshTokenEnc: null,
    tokenExpiresAt: null,
  };
  await db.socialAccount.upsert({
    where: { brandId_platform: { brandId, platform: "instagram" } },
    update: data,
    create: { ...data, userId, brandId, platform: "instagram" },
  });
}

/**
 * Depois do login: se o cliente liberou uma conta só, conecta direto.
 * Se liberou várias, guarda o token e manda para a tela de escolha.
 * Retorna o endereço para onde o usuário deve ir.
 */
export async function finishInstagramConnection(
  userId: string,
  brandId: string,
  token: string,
  accounts: InstagramAccount[],
): Promise<string> {
  if (accounts.length === 1) {
    await saveInstagramAccount(userId, brandId, token, accounts[0]);
    return "/paginas?msg=instagram";
  }
  const pending = await db.pendingConnection.create({
    data: { userId, brandId, platform: "instagram", tokenEnc: encrypt(token) },
  });
  return `/paginas/instagram?pendente=${pending.id}`;
}
