import path from "node:path";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { IMAGE_TYPES, saveFile, VIDEO_TYPES } from "@/lib/storage";

const MAX_VIDEO = 300 * 1024 * 1024; // 300 MB
const MAX_IMAGE = 30 * 1024 * 1024; // 30 MB

// Recebe um arquivo por vez (o navegador envia em sequência).
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase();
  const kind = VIDEO_TYPES[ext] ? "video" : IMAGE_TYPES[ext] ? "image" : null;
  if (!kind) return Response.json({ error: "Envie vídeos MP4/MOV ou imagens JPG/PNG/WEBP." }, { status: 400 });
  if (kind === "video" && file.size > MAX_VIDEO) return Response.json({ error: "Vídeo maior que 300 MB." }, { status: 400 });
  if (kind === "image" && file.size > MAX_IMAGE) return Response.json({ error: "Imagem maior que 30 MB." }, { status: 400 });

  const folder = kind === "video" ? "videos" : "imagens";
  const rel = await saveFile(`${folder}/${user.id}`, file.name, Buffer.from(await file.arrayBuffer()));
  const media = await db.media.create({
    data: {
      userId: user.id,
      kind,
      originalName: file.name.slice(0, 200),
      path: rel,
      mimeType: (kind === "video" ? VIDEO_TYPES : IMAGE_TYPES)[ext],
      size: file.size,
    },
  });
  return Response.json({
    id: media.id,
    kind: media.kind,
    path: media.path,
    originalName: media.originalName,
    size: media.size,
  });
}
