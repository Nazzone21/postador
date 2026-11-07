"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { acceptsKind, getFormat, type FormatDef } from "@/lib/formats";
import { nextSlots } from "@/lib/scheduling";
import { getTemplate } from "@/lib/templates";
import { formatDateTime, localToDate } from "@/lib/time";

const MAX_CAPTION = 2200;
const MAX_BATCH = 150;

export type ScheduleResult =
  | { ok: true; created: number; first?: string; last?: string }
  | { ok: false; error: string };

const fail = (error: string): ScheduleResult => ({ ok: false, error });

/** Confere se as contas e mídias são do usuário e servem para o formato. */
async function validate(userId: string, format: FormatDef, accountIds: string[], mediaIds: string[]) {
  const [accounts, media] = await Promise.all([
    db.socialAccount.findMany({ where: { userId, id: { in: accountIds } }, select: { id: true, platform: true } }),
    db.media.findMany({ where: { userId, id: { in: mediaIds } }, select: { id: true, kind: true } }),
  ]);
  if (accounts.length !== new Set(accountIds).size || media.length !== new Set(mediaIds).size) {
    return "Conta ou arquivo inválido.";
  }
  if (accounts.some((a) => !format.platforms.includes(a.platform))) return "Alguma conta não aceita este formato.";
  if (media.some((m) => !acceptsKind(format.accepts, m.kind))) return "Algum arquivo não serve para este formato.";
  return null;
}

function parseWhen(date: string, time: string): Date | string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return "Informe data e hora.";
  const when = localToDate(date, time);
  if (when.getTime() < Date.now() - 60_000) return "Esse horário já passou.";
  return when;
}

function done(dates: Date[]): ScheduleResult {
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  revalidatePath("/", "layout");
  return {
    ok: true,
    created: dates.length,
    first: formatDateTime(sorted[0]),
    last: formatDateTime(sorted[sorted.length - 1]),
  };
}

/** Nova postagem rápida: um Reel em uma conta. */
export async function createPost(input: {
  accountId: string;
  mediaId: string;
  caption: string;
  templateId: string;
  templateText: string;
  date: string;
  time: string;
}): Promise<ScheduleResult> {
  const user = await requireUser();
  if (!input.accountId) return fail("Escolha uma conta.");
  if (!input.mediaId) return fail("Escolha ou envie um vídeo.");
  if (input.caption.length > MAX_CAPTION) return fail("A legenda passa de 2.200 caracteres.");
  const when = parseWhen(input.date, input.time);
  if (typeof when === "string") return fail(when);
  const err = await validate(user.id, getFormat("reels")!, [input.accountId], [input.mediaId]);
  if (err) return fail(err);

  const post = await db.post.create({
    data: {
      userId: user.id,
      accountId: input.accountId,
      mediaId: input.mediaId,
      type: "REEL",
      caption: input.caption,
      templateId: getTemplate(input.templateId).id,
      templateText: input.templateText.slice(0, 300),
      scheduledAt: when,
    },
  });
  await db.postEvent.create({ data: { postId: post.id, message: `Agendado para ${formatDateTime(when)}.` } });
  return done([when]);
}

/** Lote de Posts (imagem), Reels ou Stories distribuído em dias e horários fixos. */
export async function createBulk(input: {
  format: "posts" | "reels" | "stories";
  accountIds: string[];
  mediaIds: string[];
  captionMode: "one" | "each";
  caption: string;
  captions: Record<string, string>;
  templateId: string;
  templateText: string;
  weekdays: number[];
  times: string[];
  startDate: string;
}): Promise<ScheduleResult> {
  const user = await requireUser();
  const format = getFormat(input.format);
  if (!format || !["posts", "reels", "stories"].includes(format.id)) return fail("Formato inválido.");
  const accountIds = [...new Set(input.accountIds)];
  const mediaIds = [...new Set(input.mediaIds)];
  if (!accountIds.length) return fail("Escolha pelo menos uma conta.");
  if (!mediaIds.length) return fail("Escolha pelo menos um arquivo.");
  if (mediaIds.length > MAX_BATCH) return fail(`Use até ${MAX_BATCH} arquivos por lote.`);
  if (!input.weekdays.length) return fail("Escolha pelo menos um dia da semana.");
  const times = input.times.filter((t) => /^\d{2}:\d{2}$/.test(t));
  if (!times.length) return fail("Adicione pelo menos um horário.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) return fail("Informe a data de início.");

  const captionFor = (mediaId: string) =>
    format.type === "STORY" ? "" : input.captionMode === "each" ? input.captions[mediaId] ?? "" : input.caption;
  if (mediaIds.some((m) => captionFor(m).length > MAX_CAPTION)) return fail("Alguma legenda passa de 2.200 caracteres.");

  const err = await validate(user.id, format, accountIds, mediaIds);
  if (err) return fail(err);

  const batchId = randomUUID();
  const templateId = format.type === "REEL" ? getTemplate(input.templateId).id : "original";
  const rows: { accountId: string; mediaId: string; scheduledAt: Date }[] = [];

  for (const accountId of accountIds) {
    const existing = await db.post.findMany({
      where: { accountId, status: { in: ["SCHEDULED", "PROCESSING"] } },
      select: { scheduledAt: true },
    });
    const slots = nextSlots({
      startDate: input.startDate,
      weekdays: input.weekdays,
      times,
      count: mediaIds.length,
      taken: new Set(existing.map((p) => p.scheduledAt.getTime())),
    });
    if (slots.length < mediaIds.length) return fail("Não há horários livres suficientes. Adicione dias ou horários.");
    mediaIds.forEach((mediaId, i) => rows.push({ accountId, mediaId, scheduledAt: slots[i] }));
  }

  await db.$transaction(async (tx) => {
    for (const r of rows) {
      const post = await tx.post.create({
        data: {
          userId: user.id,
          accountId: r.accountId,
          mediaId: r.mediaId,
          type: format.type,
          caption: captionFor(r.mediaId),
          templateId,
          templateText: templateId === "original" ? "" : input.templateText.slice(0, 300),
          scheduledAt: r.scheduledAt,
          batchId,
        },
      });
      await tx.postEvent.create({
        data: { postId: post.id, message: `Agendado em lote para ${formatDateTime(r.scheduledAt)}.` },
      });
    }
  });
  return done(rows.map((r) => r.scheduledAt));
}

/** Carrossel: de 2 a 10 mídias, publicado em uma ou mais contas no mesmo horário. */
export async function createCarousel(input: {
  accountIds: string[];
  mediaIds: string[];
  caption: string;
  date: string;
  time: string;
}): Promise<ScheduleResult> {
  const user = await requireUser();
  const accountIds = [...new Set(input.accountIds)];
  const mediaIds = [...new Set(input.mediaIds)];
  if (!accountIds.length) return fail("Escolha pelo menos uma conta.");
  if (mediaIds.length < 2 || mediaIds.length > 10) return fail("O carrossel precisa ter de 2 a 10 arquivos.");
  if (input.caption.length > MAX_CAPTION) return fail("A legenda passa de 2.200 caracteres.");
  const when = parseWhen(input.date, input.time);
  if (typeof when === "string") return fail(when);
  const err = await validate(user.id, getFormat("carrossel")!, accountIds, mediaIds);
  if (err) return fail(err);

  const batchId = randomUUID();
  await db.$transaction(async (tx) => {
    for (const accountId of accountIds) {
      const post = await tx.post.create({
        data: {
          userId: user.id,
          accountId,
          mediaId: mediaIds[0],
          type: "CAROUSEL",
          caption: input.caption,
          scheduledAt: when,
          batchId,
          items: { create: mediaIds.map((mediaId, position) => ({ mediaId, position })) },
        },
      });
      await tx.postEvent.create({
        data: { postId: post.id, message: `Carrossel com ${mediaIds.length} páginas agendado para ${formatDateTime(when)}.` },
      });
    }
  });
  return done(accountIds.map(() => when));
}

/** YouTube: um vídeo com título, descrição e privacidade. */
export async function createYoutube(input: {
  accountId: string;
  mediaId: string;
  title: string;
  description: string;
  privacy: string;
  isShort: boolean;
  date: string;
  time: string;
}): Promise<ScheduleResult> {
  const user = await requireUser();
  if (!input.accountId) return fail("Escolha uma conta.");
  if (!input.mediaId) return fail("Escolha ou envie um vídeo.");
  let title = input.title.trim().replace(/[<>]/g, "");
  if (input.isShort && !/#shorts/i.test(title)) title = `${title.slice(0, 92)} #Shorts`;
  if (!title) return fail("Informe o título.");
  if (title.length > 100) return fail("O título passa de 100 caracteres.");
  if (input.description.length > 5000) return fail("A descrição passa de 5.000 caracteres.");
  const privacy = ["public", "unlisted", "private"].includes(input.privacy) ? input.privacy : "public";
  const when = parseWhen(input.date, input.time);
  if (typeof when === "string") return fail(when);
  const err = await validate(user.id, getFormat("youtube")!, [input.accountId], [input.mediaId]);
  if (err) return fail(err);

  const post = await db.post.create({
    data: {
      userId: user.id,
      accountId: input.accountId,
      mediaId: input.mediaId,
      type: "YOUTUBE",
      title,
      caption: input.description.replace(/[<>]/g, ""),
      privacy,
      scheduledAt: when,
    },
  });
  await db.postEvent.create({ data: { postId: post.id, message: `Vídeo agendado para ${formatDateTime(when)}.` } });
  return done([when]);
}
