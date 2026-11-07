// Formatos de publicação disponíveis no agendamento.

export type FormatId = "posts" | "carrossel" | "reels" | "stories" | "youtube";
export type PostType = "POST" | "CAROUSEL" | "REEL" | "STORY" | "YOUTUBE";
export type MediaAccept = "image" | "video" | "both";

export type FormatDef = {
  id: FormatId;
  type: PostType;
  name: string;
  description: string;
  networks: string;
  accepts: MediaAccept;
  platforms: string[]; // redes que recebem este formato
};

export const FORMATS: FormatDef[] = [
  {
    id: "posts",
    type: "POST",
    name: "Posts",
    description: "Cada imagem vira uma publicação no feed, no horário que você escolher.",
    networks: "Instagram · uma imagem por post",
    accepts: "image",
    platforms: ["instagram", "simulado"],
  },
  {
    id: "carrossel",
    type: "CAROUSEL",
    name: "Carrosséis",
    description: "Junte imagens e vídeos em uma única publicação com várias páginas.",
    networks: "Instagram · de 2 a 10 mídias",
    accepts: "both",
    platforms: ["instagram", "simulado"],
  },
  {
    id: "reels",
    type: "REEL",
    name: "Reels",
    description: "Envie vídeos, aplique um modelo de edição e distribua os horários do lote.",
    networks: "Instagram · TikTok e Facebook em breve",
    accepts: "video",
    platforms: ["instagram", "simulado"],
  },
  {
    id: "stories",
    type: "STORY",
    name: "Stories",
    description: "Envie várias imagens ou vídeos e distribua os Stories entre contas, dias e horários.",
    networks: "Instagram · imagem ou vídeo",
    accepts: "both",
    platforms: ["instagram", "simulado"],
  },
  {
    id: "youtube",
    type: "YOUTUBE",
    name: "YouTube",
    description: "Publique vídeos e Shorts com título, descrição e privacidade definidos.",
    networks: "YouTube · um vídeo por agendamento",
    accepts: "video",
    platforms: ["youtube", "simulado"],
  },
];

export function getFormat(id: string): FormatDef | null {
  return FORMATS.find((f) => f.id === id) ?? null;
}

export function formatForType(type: string): FormatDef {
  return FORMATS.find((f) => f.type === type) ?? FORMATS[2];
}

export const TYPE_LABEL: Record<string, string> = {
  POST: "Post",
  CAROUSEL: "Carrossel",
  REEL: "Reel",
  STORY: "Story",
  YOUTUBE: "YouTube",
};

export function acceptsKind(accepts: MediaAccept, kind: string): boolean {
  return accepts === "both" || accepts === kind;
}
