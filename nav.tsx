"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/painel", label: "Painel" },
  { href: "/agendar", label: "Agendar publicações" },
  { href: "/nova", label: "Nova postagem" },
  { href: "/calendario", label: "Calendário" },
  { href: "/fila", label: "Publicações" },
  { href: "/videos", label: "Meus arquivos" },
  { href: "/paginas", label: "Páginas e contas" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ITEMS.map((item) => {
        const active = path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
              active ? "bg-accent-soft font-medium text-accent-ink" : "text-muted hover:bg-white/5 hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
