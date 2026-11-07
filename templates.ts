// Modelos de edição. As medidas estão no quadro final de 1080x1920 (9:16)
// e são usadas tanto pela prévia no navegador quanto pela renderização FFmpeg.

export const CANVAS = { w: 1080, h: 1920 } as const;

export type TemplateId = "original" | "post-claro" | "post-escuro" | "manchete" | "marca-dagua";

export type TemplateDef = {
  id: TemplateId;
  name: string;
  description: string;
  usesText: boolean; // usa o texto do modelo (frase/manchete)
  usesBrand: boolean; // usa nome/@/avatar da marca
};

export const TEMPLATES: TemplateDef[] = [
  {
    id: "original",
    name: "Vídeo como está",
    description: "Publica o arquivo enviado, sem edição.",
    usesText: false,
    usesBrand: false,
  },
  {
    id: "post-claro",
    name: "Post claro",
    description: "Fundo branco com avatar, nome, @ e texto acima do vídeo.",
    usesText: true,
    usesBrand: true,
  },
  {
    id: "post-escuro",
    name: "Post escuro",
    description: "Mesmo layout do post claro, em fundo escuro.",
    usesText: true,
    usesBrand: true,
  },
  {
    id: "manchete",
    name: "Manchete",
    description: "Vídeo em tela cheia com uma faixa de destaque no topo.",
    usesText: true,
    usesBrand: true,
  },
  {
    id: "marca-dagua",
    name: "Marca d'água",
    description: "Vídeo inteiro com o seu @ discreto no canto.",
    usesText: false,
    usesBrand: true,
  },
];

export function getTemplate(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

// Layout dos modelos "post" (claro/escuro)
export const POST_LAYOUT = {
  padX: 60,
  avatar: { x: 60, y: 180, size: 120 },
  name: { x: 210, y: 192, size: 46 },
  handle: { x: 210, y: 252, size: 38 },
  text: { x: 60, y: 360, size: 50, lineGap: 18, maxLines: 6, charsPerLine: 32 },
  video: { y: 790, h: 1010 },
} as const;

// Layout do modelo "manchete"
export const HEADLINE_LAYOUT = {
  bar: { y: 180, padY: 36, padX: 50 },
  text: { size: 64, lineGap: 16, maxLines: 3, charsPerLine: 21 },
  handle: { x: 50, bottom: 140, size: 40 },
} as const;

// Layout do modelo "marca d'água"
export const WATERMARK_LAYOUT = { right: 50, bottom: 140, size: 40 } as const;

/** Quebra o texto em linhas (aproximação por número de caracteres). */
export function wrapText(text: string, charsPerLine: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let truncated = false;
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= charsPerLine) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (lines.length === maxLines) {
      truncated = true;
      current = "";
      break;
    }
    current = word.slice(0, charsPerLine);
  }
  if (current) {
    if (lines.length < maxLines) lines.push(current);
    else truncated = true;
  }
  if (truncated && lines.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = `${last.slice(0, charsPerLine - 1)}…`;
  }
  return lines;
}

/** Texto usado pelo modelo: o texto próprio ou a primeira linha da legenda. */
export function templateTextFor(templateText: string, caption: string): string {
  if (templateText.trim()) return templateText.trim();
  return (caption.split("\n").find((l) => l.trim()) ?? "").trim();
}
