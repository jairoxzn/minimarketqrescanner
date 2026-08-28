"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { visibleNavSections } from "@/lib/nav";

export function Sidebar({ role, businessName }: { role: Role; businessName: string }) {
  const pathname = usePathname();
  const sections = visibleNavSections(role);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white h-screen sticky top-0 shadow-sm shadow-slate-900/5">
      <div className="h-16 flex items-center gap-2.5 px-5">
        <span className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-lg shadow-sm shadow-primary/30">
          🛍️
        </span>
        <span className="text-lg font-extrabold text-foreground tracking-tight">VendeMóvil</span>
      </div>

      <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-background px-3 py-2">
        <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
          {businessName.charAt(0).toUpperCase()}
        </span>
        <span className="text-xs font-medium text-muted truncate">{businessName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-4">
        {sections.map((group) => (
          <div key={group.section} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted/80">
              {group.section}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "text-foreground hover:bg-background"
                  }`}
                >
                  <span
                    className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-sm transition-colors ${
                      active ? "bg-white/20" : "bg-background group-hover:bg-white"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
