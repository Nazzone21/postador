import "server-only";
import { db } from "./db";
import { acceptsKind, type FormatDef } from "./formats";

/** Contas e arquivos do usuário no formato usado pelos formulários de agendamento. */
export async function scheduleOptions(userId: string, format?: FormatDef) {
  const [accounts, media] = await Promise.all([
    db.socialAccount.findMany({
      where: { userId, ...(format ? { platform: { in: format.platforms } } : {}) },
      include: { brand: { select: { name: true, handle: true, avatarPath: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.media.findMany({
      where: { userId },
      select: { id: true, kind: true, path: true, originalName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return {
    accounts: accounts.map((a) => ({ id: a.id, platform: a.platform, username: a.username, brand: a.brand })),
    media: format ? media.filter((m) => acceptsKind(format.accepts, m.kind)) : media.filter((m) => m.kind === "video"),
  };
}
