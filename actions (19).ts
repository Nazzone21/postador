"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeFile } from "@/lib/storage";

export async function deletePost(postId: string) {
  const user = await requireUser();
  const post = await db.post.findFirst({
    where: { id: postId, userId: user.id, status: { in: ["SCHEDULED", "FAILED"] } },
    include: { media: { select: { path: true } }, items: { include: { media: { select: { path: true } } } } },
  });
  if (!post) return;
  await db.post.delete({ where: { id: post.id } });
  // Apaga só os arquivos gerados (versões editadas/convertidas), nunca os originais
  if (post.renderedPath && post.renderedPath !== post.media.path) await removeFile(post.renderedPath);
  for (const item of post.items) {
    if (item.renderedPath && item.renderedPath !== item.media.path) await removeFile(item.renderedPath);
  }
  revalidatePath("/", "layout");
}

export async function retryPost(postId: string) {
  const user = await requireUser();
  const updated = await db.post.updateMany({
    where: { id: postId, userId: user.id, status: "FAILED" },
    // renderedPath = null força preparar os arquivos de novo
    data: { status: "SCHEDULED", scheduledAt: new Date(), error: null, renderedPath: null },
  });
  if (updated.count) {
    await db.postItem.updateMany({ where: { postId }, data: { renderedPath: null } });
    await db.postEvent.create({ data: { postId, message: "Nova tentativa pedida." } });
  }
  revalidatePath("/", "layout");
}
