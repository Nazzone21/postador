import { requireUser } from "@/lib/auth";
import { logout } from "../(auth)/actions";
import { Nav } from "./nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 z-10 border-b border-line bg-[#0b0c0f]/80 p-3 backdrop-blur-xl md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-b-0 md:p-5">
        <div className="mb-3 flex items-center gap-2.5 px-2 md:mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5b7cff] to-[#2440d8] text-sm font-extrabold text-white shadow-[0_6px_18px_-6px_rgba(47,92,255,0.8)]">
            C
          </div>
          <span className="text-[15px] font-bold tracking-tight">Cadência</span>
        </div>
        <Nav />
        <div className="mt-auto hidden border-t border-line pt-4 md:block">
          <p className="truncate px-2 text-sm font-medium">{user.name}</p>
          <p className="truncate px-2 text-xs text-muted">{user.email}</p>
          <form action={logout}>
            <button className="mt-2 w-full rounded-xl px-2 py-1.5 text-left text-sm text-muted hover:bg-white/5 hover:text-ink">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
