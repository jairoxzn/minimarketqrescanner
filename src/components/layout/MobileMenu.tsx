"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import { visibleNavSections } from "@/lib/nav";

export function MobileMenu({
  open,
  onClose,
  role,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  role: Role;
  userName: string;
}) {
  const pathname = usePathname();
  if (!open) return null;
  const sections = visibleNavSections(role);

  return (
    <div className="no-print fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl flex flex-col">
        <div className="h-16 flex items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-lg">🛍️</span>
            <span className="text-lg font-extrabold text-foreground tracking-tight">VendeMóvil</span>
          </div>
          <button onClick={onClose} aria-label="Cerrar menú" className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-background text-muted">
            ✕
          </button>
        </div>
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-background px-3 py-2">
          <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </span>
          <span className="text-xs font-medium text-muted truncate">{userName}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-4">
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
                    onClick={onClose}
                    className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      active ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25" : "text-foreground hover:bg-background"
                    }`}
                  >
                    <span className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-sm ${active ? "bg-white/20" : "bg-background group-hover:bg-white"}`}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-danger hover:bg-red-50"
          >
            <span className="h-7 w-7 shrink-0 rounded-lg bg-red-50 flex items-center justify-center text-sm">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
