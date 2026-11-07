import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorizeUrl, youtubeConfigured } from "@/lib/platforms/youtube";

// Inicia o login do Google para conectar um canal do YouTube a uma página.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!youtubeConfigured()) redirect("/paginas?msg=yt-config");

  const brandId = new URL(req.url).searchParams.get("brand") ?? "";
  const brand = await db.brand.findFirst({ where: { id: brandId, userId: user.id } });
  if (!brand) redirect("/paginas");

  const state = randomBytes(24).toString("base64url");
  const jar = await cookies();
  jar.set("yt_oauth", JSON.stringify({ state, brandId: brand.id }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  redirect(authorizeUrl(state));
}
