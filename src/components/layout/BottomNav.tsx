"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_TAB_ITEMS } from "@/lib/nav";

export function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]">
      {MOBILE_TAB_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium ${
              active ? "text-primary" : "text-muted"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
      <button
        onClick={onMore}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted"
      >
        <span className="text-lg">☰</span>
        Más
      </button>
    </nav>
  );
}
