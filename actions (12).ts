"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeFile } from "@/lib/storage";

const PENDING = { in: ["SCHEDULED", "PROCESSING"] };

async function pendingUses(mediaId: string) {
  const [asMain, asItem] = await Promise.all([
    db.post.count({ where: { mediaId, status: PENDING } }),
    db.postItem.count({ where: { mediaId, post: { status: PENDING } } }),
  ]);
  return asMain + asItem;
}

export async function deleteMedia(mediaId: string) {
  const user = await requireUser();
  const media = await db.media.findFirst({ where: { id: mediaId, userId: user.id } });
  if (!media) return;
  // Não apaga arquivos que ainda têm publicações na fila
  if ((await pendingUses(media.id)) > 0) return;
  await db.media.delete({ where: { id: media.id } });
  await removeFile(media.path);
  revalidatePath("/videos");
}
