import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { finishInstagramConnection } from "@/lib/instagram-connect";
import { exchangeCode, listAccounts } from "@/lib/platforms/instagram";

// Retorno do login unificado da Meta.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) redirect("/login");

  const url = new URL(req.url);
  const jar = await cookies();
  const saved = jar.get("ig_oauth")?.value;
  jar.delete("ig_oauth");

  if (url.searchParams.get("error")) redirect("/paginas?msg=ig-denied");

  let pending: { state: string; brandId: string } | null = null;
  try {
    pending = saved ? JSON.parse(saved) : null;
  } catch {
    pending = null;
  }
  const code = url.searchParams.get("code");
  if (!pending || !code || url.searchParams.get("state") !== pending.state) redirect("/paginas?msg=ig-state");

  const brand = await db.brand.findFirst({ where: { id: pending.brandId, userId: user.id } });
  if (!brand) redirect("/paginas");

  let next = "/paginas?msg=ig-error";
  try {
    const token = await exchangeCode(code);
    const accounts = await listAccounts(token);
    if (accounts.length) next = await finishInstagramConnection(user.id, brand.id, token, accounts);
    else next = "/paginas?msg=ig-none";
  } catch (err) {
    console.error("[instagram] falha ao conectar:", err);
  }
  redirect(next);
}
