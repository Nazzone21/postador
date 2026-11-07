/* eslint-disable @next/next/no-img-element */

/** Miniatura de um arquivo da biblioteca (imagem ou vídeo). */
export function MediaThumb({
  path,
  kind,
  className = "",
  controls = false,
}: {
  path: string;
  kind: string;
  className?: string;
  controls?: boolean;
}) {
  if (kind === "image") {
    return <img src={`/api/media/${path}`} alt="" loading="lazy" className={`bg-black object-cover ${className}`} />;
  }
  return (
    <video
      src={`/api/media/${path}#t=0.5`}
      preload="metadata"
      muted
      controls={controls}
      className={`bg-black object-cover ${className}`}
    />
  );
}
