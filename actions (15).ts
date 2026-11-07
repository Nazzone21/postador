"use server";

import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { IMAGE_TYPES, removeFile, saveFile } from "@/lib/storage";

export type FormState = { error?: string; ok?: boolean } | undefined;

export async function createBrand(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const handle = String(form.get("handle") ?? "").trim().replace(/^@+/, "");
  if (!name) return { error: "Informe o nome da página." };
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) return { error: "O @ pode ter letras, números, ponto e _ (até 30)." };

  let avatarPath: string | null = null;
  const avatar = form.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const ext = path.extname(avatar.name).toLowerCase();
    if (!IMAGE_TYPES[ext]) return { error: "O avatar precisa ser PNG, JPG ou WEBP." };
    if (avatar.size > 3 * 1024 * 1024) return { error: "O avatar precisa ter até 3 MB." };
    avatarPath = await saveFile(`avatars/${user.id}`, avatar.name, Buffer.from(await avatar.arrayBuffer()));
  }

  await db.brand.create({ data: { userId: user.id, name, handle, avatarPath } });
  revalidatePath("/paginas");
  return { ok: true };
}

export async function deleteBrand(brandId: string) {
  const user = await requireUser();
  const brand = await db.brand.findFirst({ where: { id: brandId, userId: user.id } });
  if (!brand) return;
  await db.brand.delete({ where: { id: brand.id } });
  await removeFile(brand.avatarPath);
  revalidatePath("/paginas");
}

/** Conta de teste: percorre todo o fluxo, mas não publica em nenhuma rede. */
export async function addSimulatedAccount(brandId: string) {
  const user = await requireUser();
  const brand = await db.brand.findFirst({ where: { id: brandId, userId: user.id } });
  if (!brand) return;
  await db.socialAccount.upsert({
    where: { brandId_platform: { brandId: brand.id, platform: "simulado" } },
    update: {},
    create: {
      userId: user.id,
      brandId: brand.id,
      platform: "simulado",
      externalId: randomUUID(),
      username: brand.handle,
    },
  });
  revalidatePath("/paginas");
}

export async function disconnectAccount(accountId: string) {
  const user = await requireUser();
  await db.socialAccount.deleteMany({ where: { id: accountId, userId: user.id } });
  revalidatePath("/paginas");
}
