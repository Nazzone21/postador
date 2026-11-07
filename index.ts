// Worker: procura posts com horário vencido, prepara os arquivos e publica.
// Rode junto com o site (npm run dev / npm start). Em produção ele precisa
// ficar ligado em um servidor para publicar com o seu computador desligado.
import "./env";
import { db } from "../lib/db";
import { ensureJpeg, renderPost } from "../lib/render";
import { publish, type ReadyFile } from "../lib/platforms/index";
import { storagePath } from "../lib/storage";

const POLL_MS = 15_000;
const BATCH = 3;
const STUCK_MS = 30 * 60 * 1000;

async function log(postId: string, message: string, level: "info" | "error" = "info") {
  await db.postEvent.create({ data: { postId, message, level } });
  console.log(`[worker] ${postId.slice(-6)} ${message}`);
}

const ready = (rel: string, kind: string): ReadyFile => ({
  rel,
  abs: storagePath(rel),
  kind: kind === "image" ? "image" : "video",
});

async function loadPost(postId: string) {
  return db.post.findUniqueOrThrow({
    where: { id: postId },
    include: {
      media: true,
      account: { include: { brand: true } },
      items: { include: { media: true }, orderBy: { position: "asc" } },
    },
  });
}

/** Prepara os arquivos de cada formato (modelo de edição, conversão para JPEG…). */
async function prepareFiles(post: Awaited<ReturnType<typeof loadPost>>): Promise<ReadyFile[]> {
  switch (post.type) {
    case "REEL": {
      let rel = post.renderedPath;
      if (!rel) {
        if (post.templateId !== "original") await log(post.id, "Aplicando o modelo de edição…");
        rel = await renderPost({
          templateId: post.templateId,
          templateText: post.templateText,
          caption: post.caption,
          videoPath: post.media.path,
          brand: {
            name: post.account.brand.name,
            handle: post.account.brand.handle,
            avatarPath: post.account.brand.avatarPath,
          },
        });
        await db.post.update({ where: { id: post.id }, data: { renderedPath: rel } });
        if (post.templateId !== "original") await log(post.id, "Vídeo editado.");
      }
      return [ready(rel, "video")];
    }
    case "POST":
    case "STORY": {
      if (post.media.kind !== "image") return [ready(post.media.path, "video")];
      let rel = post.renderedPath;
      if (!rel) {
        rel = await ensureJpeg(post.media.path);
        await db.post.update({ where: { id: post.id }, data: { renderedPath: rel } });
      }
      return [ready(rel, "image")];
    }
    case "CAROUSEL": {
      const files: ReadyFile[] = [];
      for (const item of post.items) {
        if (item.media.kind !== "image") {
          files.push(ready(item.media.path, "video"));
          continue;
        }
        let rel = item.renderedPath;
        if (!rel) {
          rel = await ensureJpeg(item.media.path);
          await db.postItem.update({ where: { id: item.id }, data: { renderedPath: rel } });
        }
        files.push(ready(rel, "image"));
      }
      if (files.length < 2) throw new Error("O carrossel precisa de pelo menos 2 arquivos.");
      return files;
    }
    case "YOUTUBE":
      return [ready(post.media.path, "video")];
    default:
      throw new Error(`Formato desconhecido: ${post.type}`);
  }
}

async function processPost(postId: string) {
  // Reserva o post (evita processar duas vezes)
  const claimed = await db.post.updateMany({
    where: { id: postId, status: "SCHEDULED" },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return;

  const post = await loadPost(postId);
  await log(post.id, "Iniciando o envio.");

  try {
    const files = await prepareFiles(post);
    const result = await publish({
      account: post.account,
      type: post.type,
      caption: post.caption,
      title: post.title,
      privacy: post.privacy,
      files,
      log: (m) => log(post.id, m),
    });

    await db.post.update({
      where: { id: post.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        externalId: result.externalId,
        permalink: result.permalink,
        error: null,
      },
    });
    await log(post.id, result.permalink ? `Publicado: ${result.permalink}` : "Publicado.");
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    await db.post.update({ where: { id: post.id }, data: { status: "FAILED", error: message.slice(0, 1000) } });
    await log(post.id, `Falhou: ${message}`, "error");
  }
}

async function tick() {
  // Posts que ficaram presos em "Publicando" (ex.: worker reiniciado) passam para falha com aviso
  const stuck = await db.post.findMany({
    where: { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - STUCK_MS) } },
    select: { id: true },
  });
  for (const s of stuck) {
    await db.post.update({ where: { id: s.id }, data: { status: "FAILED", error: "O envio foi interrompido." } });
    await log(s.id, "O envio foi interrompido. Use \"Tentar de novo\".", "error");
  }

  const due = await db.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: BATCH,
    select: { id: true },
  });
  await Promise.all(due.map((p) => processPost(p.id)));
}

console.log(`[worker] rodando: verifica a fila a cada ${POLL_MS / 1000}s.`);
let running = false;
async function loop() {
  if (running) return;
  running = true;
  try {
    await tick();
  } catch (err) {
    console.error("[worker] erro:", err);
  } finally {
    running = false;
  }
}
void loop();
setInterval(loop, POLL_MS);
