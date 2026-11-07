// Renderização dos modelos de edição com FFmpeg (usada pelo worker).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import ffmpegStatic from "ffmpeg-static";
import {
  CANVAS,
  HEADLINE_LAYOUT,
  POST_LAYOUT,
  WATERMARK_LAYOUT,
  getTemplate,
  templateTextFor,
  wrapText,
} from "./templates";
import { STORAGE_DIR, storagePath } from "./storage";

const FFMPEG = process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string | null) || "ffmpeg";

const FONT_DIR = path.resolve(process.env.FONT_DIR ?? "node_modules/dejavu-fonts-ttf/ttf");
const FONT_BOLD = path.join(FONT_DIR, "DejaVuSans-Bold.ttf");
const FONT_REGULAR = path.join(FONT_DIR, "DejaVuSans.ttf");

/** Caminho para usar dentro de um filtro do FFmpeg (relativo e com ":" escapado). */
function ff(p: string): string {
  let rel = path.relative(process.cwd(), p).split(path.sep).join("/");
  rel = rel.replace(/:/g, "\\:");
  return `'${rel}'`;
}

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { cwd: process.cwd(), windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr = (stderr + d.toString()).slice(-4000);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg falhou (código ${code}): ${stderr.split("\n").slice(-6).join(" ")}`));
    });
  });
}

const ENCODE = [
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-r", "30",
  "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-movflags", "+faststart",
];

/**
 * Garante que a imagem está em JPEG (o Instagram só aceita JPEG).
 * Retorna o caminho relativo da imagem pronta.
 */
export async function ensureJpeg(rel: string): Promise<string> {
  if (/\.jpe?g$/i.test(rel)) return rel;
  const outRel = `rendered/${randomUUID()}.jpg`;
  const outPath = storagePath(outRel);
  await mkdir(path.dirname(outPath), { recursive: true });
  // Fundo branco para imagens com transparência
  await run([
    "-y",
    "-i", storagePath(rel),
    "-filter_complex", "[0:v]split[a][b];[a]drawbox=c=white:t=fill[bg];[bg][b]overlay=format=auto,format=yuvj444p[out]",
    "-map", "[out]",
    "-frames:v", "1",
    "-q:v", "2",
    outPath,
  ]);
  return outRel;
}

export type RenderInput = {
  templateId: string;
  templateText: string;
  caption: string;
  videoPath: string; // relativo ao armazenamento
  brand: { name: string; handle: string; avatarPath: string | null };
};

/** Gera o vídeo final. Retorna o caminho relativo no armazenamento. */
export async function renderPost(input: RenderInput): Promise<string> {
  const tpl = getTemplate(input.templateId);
  if (tpl.id === "original") return input.videoPath;

  for (const f of [FONT_BOLD, FONT_REGULAR]) {
    if (!existsSync(f)) throw new Error(`Fonte não encontrada: ${f}. Rode "npm install".`);
  }

  const job = randomUUID();
  const tmpDir = path.join(STORAGE_DIR, "tmp", job);
  await mkdir(tmpDir, { recursive: true });
  const outRel = `rendered/${job}.mp4`;
  const outPath = storagePath(outRel);
  await mkdir(path.dirname(outPath), { recursive: true });

  const txt = async (name: string, content: string) => {
    const p = path.join(tmpDir, `${name}.txt`);
    await writeFile(p, content, "utf8");
    return ff(p);
  };

  const handle = input.brand.handle.startsWith("@") ? input.brand.handle : `@${input.brand.handle}`;
  const text = templateTextFor(input.templateText, input.caption);
  const video = storagePath(input.videoPath);
  const bold = ff(FONT_BOLD);
  const regular = ff(FONT_REGULAR);

  try {
    if (tpl.id === "post-claro" || tpl.id === "post-escuro") {
      const L = POST_LAYOUT;
      const dark = tpl.id === "post-escuro";
      const bg = dark ? "0x15171c" : "0xffffff";
      const fg = dark ? "0xf4f4f5" : "0x0f1115";
      const muted = dark ? "0x9ca3af" : "0x6b7280";
      const lines = wrapText(text, L.text.charsPerLine, L.text.maxLines);
      const r = L.avatar.size / 2;

      const avatarAbs = input.brand.avatarPath ? storagePath(input.brand.avatarPath) : null;
      const avatarInput = avatarAbs && existsSync(avatarAbs)
        ? ["-loop", "1", "-i", avatarAbs]
        : ["-f", "lavfi", "-i", `color=c=0x7c3aed:s=${L.avatar.size}x${L.avatar.size}:r=30`];
      const hasAvatarImage = avatarInput[0] === "-loop";

      const initial = (input.brand.name.trim()[0] ?? "?").toUpperCase();
      const filters = [
        `[1:v]scale=${CANVAS.w}:${L.video.h}:force_original_aspect_ratio=decrease,setsar=1[v]`,
        `[2:v]scale=${L.avatar.size}:${L.avatar.size}:force_original_aspect_ratio=increase,crop=${L.avatar.size}:${L.avatar.size},format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-${r},Y-${r}),${r}),255,0)'[av]`,
        `[0:v][v]overlay=x=(W-w)/2:y=${L.video.y}+(${L.video.h}-h)/2:shortest=1[b1]`,
        `[b1][av]overlay=x=${L.avatar.x}:y=${L.avatar.y}:shortest=1[b2]`,
        [
          `[b2]drawtext=fontfile=${bold}:textfile=${await txt("name", input.brand.name)}:expansion=none:fontcolor=${fg}:fontsize=${L.name.size}:x=${L.name.x}:y=${L.name.y}`,
          `drawtext=fontfile=${regular}:textfile=${await txt("handle", handle)}:expansion=none:fontcolor=${muted}:fontsize=${L.handle.size}:x=${L.handle.x}:y=${L.handle.y}`,
          lines.length
            ? `drawtext=fontfile=${regular}:textfile=${await txt("body", lines.join("\n"))}:expansion=none:fontcolor=${fg}:fontsize=${L.text.size}:line_spacing=${L.text.lineGap}:x=${L.text.x}:y=${L.text.y}`
            : null,
          hasAvatarImage
            ? null
            : `drawtext=fontfile=${bold}:textfile=${await txt("initial", initial)}:expansion=none:fontcolor=white:fontsize=56:x=${L.avatar.x}+(${L.avatar.size}-tw)/2:y=${L.avatar.y}+(${L.avatar.size}-th)/2`,
        ]
          .filter(Boolean)
          .join(",") + "[out]",
      ];

      await run([
        "-y",
        "-f", "lavfi", "-i", `color=c=${bg}:s=${CANVAS.w}x${CANVAS.h}:r=30`,
        "-i", video,
        ...avatarInput,
        "-filter_complex", filters.join(";"),
        "-map", "[out]", "-map", "1:a?",
        ...ENCODE,
        outPath,
      ]);
    } else if (tpl.id === "manchete") {
      const L = HEADLINE_LAYOUT;
      const lines = wrapText(text, L.text.charsPerLine, L.text.maxLines);
      const barH = lines.length
        ? L.bar.padY * 2 + lines.length * L.text.size + (lines.length - 1) * L.text.lineGap
        : 0;
      const chain = [
        `[0:v]scale=${CANVAS.w}:${CANVAS.h}:force_original_aspect_ratio=increase,crop=${CANVAS.w}:${CANVAS.h},setsar=1`,
        lines.length ? `drawbox=x=0:y=${L.bar.y}:w=${CANVAS.w}:h=${barH}:color=0xffd60a@1:t=fill` : null,
        lines.length
          ? `drawtext=fontfile=${bold}:textfile=${await txt("body", lines.join("\n"))}:expansion=none:fontcolor=0x111111:fontsize=${L.text.size}:line_spacing=${L.text.lineGap}:x=${L.bar.padX}:y=${L.bar.y + L.bar.padY}`
          : null,
        `drawtext=fontfile=${bold}:textfile=${await txt("handle", handle)}:expansion=none:fontcolor=white:fontsize=${L.handle.size}:x=${L.handle.x}:y=h-${L.handle.bottom}-th:box=1:boxcolor=black@0.45:boxborderw=14`,
      ].filter(Boolean);
      await run([
        "-y", "-i", video,
        "-filter_complex", chain.join(",") + "[out]",
        "-map", "[out]", "-map", "0:a?",
        ...ENCODE,
        outPath,
      ]);
    } else if (tpl.id === "marca-dagua") {
      const L = WATERMARK_LAYOUT;
      const chain = [
        `[0:v]scale=${CANVAS.w}:${CANVAS.h}:force_original_aspect_ratio=decrease,pad=${CANVAS.w}:${CANVAS.h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`,
        `drawtext=fontfile=${bold}:textfile=${await txt("handle", handle)}:expansion=none:fontcolor=white@0.75:fontsize=${L.size}:x=w-tw-${L.right}:y=h-th-${L.bottom}:shadowcolor=black@0.5:shadowx=2:shadowy=2`,
      ];
      await run([
        "-y", "-i", video,
        "-filter_complex", chain.join(",") + "[out]",
        "-map", "[out]", "-map", "0:a?",
        ...ENCODE,
        outPath,
      ]);
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
  return outRel;
}
