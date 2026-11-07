import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { contentTypeFor, storagePath } from "./storage";

/** Entrega um arquivo do armazenamento, com suporte a Range (player de vídeo). */
export async function serveFile(req: Request, rel: string, cache = "private, max-age=3600"): Promise<Response> {
  let full: string;
  try {
    full = storagePath(rel);
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
  const info = await stat(full).catch(() => null);
  if (!info) return new Response("Não encontrado", { status: 404 });

  const type = contentTypeFor(rel);
  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), info.size - 1) : info.size - 1;
    if (start >= info.size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    const stream = Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${info.size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": cache,
      },
    });
  }
  const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(info.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": cache,
    },
  });
}
