import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorizeUrl, instagramLoginConfigured } from "@/lib/platforms/instagram";

// Inicia o login unificado da Meta (Instagram ou Facebook) para conectar contas a uma página.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!instagramLoginConfigured()) redirect("/paginas?msg=ig-config");

  const brandId = new URL(req.url).searchParams.get("brand") ?? "";
  const brand = await db.brand.findFirst({ where: { id: brandId, userId: user.id } });
  if (!brand) redirect("/paginas");

  const state = randomBytes(24).toString("base64url");
  const jar = await cookies();
  jar.set("ig_oauth", JSON.stringify({ state, brandId: brand.id }), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 600,
  });
  redirect(authorizeUrl(state));
}
