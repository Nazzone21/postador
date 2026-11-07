/* eslint-disable @next/next/no-img-element */
export function BrandAvatar({ name, avatarPath, size = 36 }: { name: string; avatarPath: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (avatarPath) {
    return <img src={`/api/media/${avatarPath}`} alt="" style={style} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <div
      style={{ ...style, fontSize: size * 0.42 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-white"
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </div>
  );
}
