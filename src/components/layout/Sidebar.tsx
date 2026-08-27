"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { visibleNavItems } from "@/lib/nav";

export function Sidebar({ role, businessName }: { role: Role; businessName: string }) {
  const pathname = usePathname();
  const items = visibleNavItems(role);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-border bg-white h-screen sticky top-0">
      <div className="h-16 flex items-center px-5 border-b border-border">
        <span className="text-lg font-bold text-primary">VendeMóvil</span>
      </div>
      <div className="px-5 py-3 text-xs text-muted truncate border-b border-border">{businessName}</div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-slate-100"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
