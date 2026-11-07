import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { exchangeCode } from "@/lib/platforms/youtube";

// Retorno do login do Google.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) redirect("/login");

  const url = new URL(req.url);
  const jar = await cookies();
  const saved = jar.get("yt_oauth")?.value;
  jar.delete("yt_oauth");

  if (url.searchParams.get("error")) redirect("/paginas?msg=yt-denied");

  let pending: { state: string; brandId: string } | null = null;
  try {
    pending = saved ? JSON.parse(saved) : null;
  } catch {
    pending = null;
  }
  const code = url.searchParams.get("code");
  if (!pending || !code || url.searchParams.get("state") !== pending.state) redirect("/paginas?msg=yt-state");

  const brand = await db.brand.findFirst({ where: { id: pending.brandId, userId: user.id } });
  if (!brand) redirect("/paginas");

  let ok = false;
  try {
    const yt = await exchangeCode(code);
    const data = {
      externalId: yt.channelId,
      username: yt.username,
      profilePictureUrl: yt.pictureUrl,
      accessTokenEnc: encrypt(yt.accessToken),
      refreshTokenEnc: encrypt(yt.refreshToken),
      tokenExpiresAt: yt.expiresAt,
    };
    await db.socialAccount.upsert({
      where: { brandId_platform: { brandId: brand.id, platform: "youtube" } },
      update: data,
      create: { ...data, userId: user.id, brandId: brand.id, platform: "youtube" },
    });
    ok = true;
  } catch (err) {
    console.error("[youtube] falha ao conectar:", err);
  }
  redirect(ok ? "/paginas?msg=youtube" : "/paginas?msg=yt-error");
}
