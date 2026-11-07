import type { FormatId } from "@/lib/formats";

// Ícones simples de linha para cada formato.
export function FormatIcon({ id, className = "h-5 w-5" }: { id: FormatId; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (id) {
    case "posts":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          <circle cx="9" cy="9" r="1.8" />
          <path d="M20.5 15.5l-4.5-4.5-8.5 9" />
        </svg>
      );
    case "carrossel":
      return (
        <svg {...common}>
          <rect x="7" y="3.5" width="13.5" height="13.5" rx="2.5" />
          <path d="M4 7.5v10a3 3 0 003 3h10" />
          <path d="M11 12.5l2.5-2.5 3.5 3.5" />
        </svg>
      );
    case "reels":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          <path d="M3.5 8.5h17M8 3.5l2.5 5M13.5 3.5l2.5 5" />
          <path d="M10.5 12v5l4-2.5-4-2.5z" />
        </svg>
      );
    case "stories":
      return (
        <svg {...common}>
          <path d="M12 3.5a8.5 8.5 0 11-6.2 2.7" strokeDasharray="2.5 2.2" />
          <circle cx="12" cy="12" r="4.5" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
          <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5z" />
        </svg>
      );
  }
}
