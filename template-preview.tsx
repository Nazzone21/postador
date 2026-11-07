/* eslint-disable @next/next/no-img-element */
"use client";

import {
  CANVAS,
  HEADLINE_LAYOUT,
  POST_LAYOUT,
  WATERMARK_LAYOUT,
  getTemplate,
  templateTextFor,
  wrapText,
} from "@/lib/templates";

export type PreviewBrand = { name: string; handle: string; avatarPath: string | null };

const FONT = '"DejaVu Sans", Verdana, Geneva, sans-serif';

// Prévia do quadro final (1080x1920) desenhada com as mesmas medidas do FFmpeg.
export function TemplatePreview({
  templateId,
  templateText,
  caption,
  videoPath,
  brand,
  width = 270,
}: {
  templateId: string;
  templateText: string;
  caption: string;
  videoPath: string | null;
  brand: PreviewBrand | null;
  width?: number;
}) {
  const tpl = getTemplate(templateId);
  const scale = width / CANVAS.w;
  const b = brand ?? { name: "Sua página", handle: "suapagina", avatarPath: null };
  const handle = `@${b.handle.replace(/^@/, "")}`;
  const text = templateTextFor(templateText, caption);
  const src = videoPath ? `/api/media/${videoPath}` : null;

  const video = (style: React.CSSProperties, fit: "contain" | "cover") =>
    src ? (
      <video
        key={src}
        src={src}
        muted
        autoPlay
        loop
        playsInline
        style={{ position: "absolute", objectFit: fit, ...style }}
      />
    ) : (
      <div
        style={{
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#8b7cf6,#4f46e5)",
          color: "white",
          fontSize: 56,
          fontFamily: FONT,
          ...style,
        }}
      >
        seu vídeo
      </div>
    );

  let content: React.ReactNode;
  if (tpl.id === "post-claro" || tpl.id === "post-escuro") {
    const L = POST_LAYOUT;
    const dark = tpl.id === "post-escuro";
    const fg = dark ? "#f4f4f5" : "#0f1115";
    const muted = dark ? "#9ca3af" : "#6b7280";
    const lines = wrapText(text, L.text.charsPerLine, L.text.maxLines);
    content = (
      <div style={{ position: "absolute", inset: 0, background: dark ? "#15171c" : "#ffffff" }}>
        {b.avatarPath ? (
          <img
            src={`/api/media/${b.avatarPath}`}
            alt=""
            style={{ position: "absolute", left: L.avatar.x, top: L.avatar.y, width: L.avatar.size, height: L.avatar.size, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{ position: "absolute", left: L.avatar.x, top: L.avatar.y, width: L.avatar.size, height: L.avatar.size, borderRadius: "50%", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, fontWeight: 700, fontFamily: FONT }}
          >
            {(b.name.trim()[0] ?? "?").toUpperCase()}
          </div>
        )}
        <div style={{ position: "absolute", left: L.name.x, top: L.name.y, fontSize: L.name.size, fontWeight: 700, color: fg, fontFamily: FONT, lineHeight: 1, whiteSpace: "nowrap" }}>
          {b.name}
        </div>
        <div style={{ position: "absolute", left: L.handle.x, top: L.handle.y, fontSize: L.handle.size, color: muted, fontFamily: FONT, lineHeight: 1, whiteSpace: "nowrap" }}>
          {handle}
        </div>
        <div style={{ position: "absolute", left: L.text.x, top: L.text.y, fontSize: L.text.size, color: fg, fontFamily: FONT, lineHeight: `${L.text.size + L.text.lineGap}px`, whiteSpace: "pre" }}>
          {lines.join("\n")}
        </div>
        {video({ left: 0, top: L.video.y, width: CANVAS.w, height: L.video.h }, "contain")}
      </div>
    );
  } else if (tpl.id === "manchete") {
    const L = HEADLINE_LAYOUT;
    const lines = wrapText(text, L.text.charsPerLine, L.text.maxLines);
    const barH = lines.length ? L.bar.padY * 2 + lines.length * L.text.size + (lines.length - 1) * L.text.lineGap : 0;
    content = (
      <div style={{ position: "absolute", inset: 0, background: "#000" }}>
        {video({ left: 0, top: 0, width: CANVAS.w, height: CANVAS.h }, "cover")}
        {lines.length > 0 && (
          <div style={{ position: "absolute", left: 0, top: L.bar.y, width: CANVAS.w, height: barH, background: "#ffd60a" }}>
            <div style={{ position: "absolute", left: L.bar.padX, top: L.bar.padY, fontSize: L.text.size, fontWeight: 700, color: "#111", fontFamily: FONT, lineHeight: `${L.text.size + L.text.lineGap}px`, whiteSpace: "pre" }}>
              {lines.join("\n")}
            </div>
          </div>
        )}
        <div style={{ position: "absolute", left: L.handle.x, bottom: L.handle.bottom, fontSize: L.handle.size, fontWeight: 700, color: "white", fontFamily: FONT, background: "rgba(0,0,0,.45)", padding: 14, lineHeight: 1 }}>
          {handle}
        </div>
      </div>
    );
  } else if (tpl.id === "marca-dagua") {
    const L = WATERMARK_LAYOUT;
    content = (
      <div style={{ position: "absolute", inset: 0, background: "#000" }}>
        {video({ left: 0, top: 0, width: CANVAS.w, height: CANVAS.h }, "contain")}
        <div style={{ position: "absolute", right: L.right, bottom: L.bottom, fontSize: L.size, fontWeight: 700, color: "rgba(255,255,255,.75)", fontFamily: FONT, textShadow: "2px 2px 0 rgba(0,0,0,.5)", lineHeight: 1 }}>
          {handle}
        </div>
      </div>
    );
  } else {
    content = (
      <div style={{ position: "absolute", inset: 0, background: "#000" }}>
        {video({ left: 0, top: 0, width: CANVAS.w, height: CANVAS.h }, "contain")}
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-line shadow-sm"
      style={{ width, height: CANVAS.h * scale, position: "relative" }}
    >
      <div style={{ width: CANVAS.w, height: CANVAS.h, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        {content}
      </div>
    </div>
  );
}
