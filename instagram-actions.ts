"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { finishInstagramConnection, saveInstagramAccount } from "@/lib/instagram-connect";
import { listAccounts } from "@/lib/platforms/instagram";

export type TokenState = { error?: string } | undefined;

/** Conectar colando o token gerado no painel da Meta (passo "Gerar tokens de acesso"). */
export async function connectInstagramWithToken(brandId: string, _: TokenState, form: FormData): Promise<TokenState> {
  const user = await requireUser();
  const brand = await db.brand.findFirst({ where: { id: brandId, userId: user.id } });
  if (!brand) return { error: "Página não encontrada." };

  const token = String(form.get("token") ?? "").trim();
  if (token.length < 20 || /\s/.test(token)) return { error: "Cole o token completo, sem espaços." };

  let accounts;
  try {
    accounts = await listAccounts(token);
  } catch (err) {
    return { error: `O Instagram recusou o token: ${(err as Error).message.replace(/^Instagram: /, "")}` };
  }
  if (!accounts.length) return { error: "Esse token não tem nenhuma conta do Instagram liberada." };

  const next = await finishInstagramConnection(user.id, brand.id, token, accounts);
  revalidatePath("/paginas");
  redirect(next);
}

/** Liga a conta do Instagram escolhida à página. */
export async function chooseInstagramAccount(pendingId: string, igId: string) {
  const user = await requireUser();
  const pending = await db.pendingConnection.findFirst({ where: { id: pendingId, userId: user.id, platform: "instagram" } });
  if (!pending) redirect("/paginas?msg=ig-state");

  const token = decrypt(pending.tokenEnc);
  const account = (await listAccounts(token)).find((a) => a.id === igId);
  if (!account) redirect("/paginas?msg=ig-error");

  await saveInstagramAccount(user.id, pending.brandId, token, account);
  await db.pendingConnection.delete({ where: { id: pending.id } });
  revalidatePath("/paginas");
  redirect("/paginas?msg=instagram");
}

export async function cancelPending(pendingId: string) {
  const user = await requireUser();
  await db.pendingConnection.deleteMany({ where: { id: pendingId, userId: user.id } });
  redirect("/paginas");
}
