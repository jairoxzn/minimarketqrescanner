"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import { visibleNavItems } from "@/lib/nav";

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
  const items = visibleNavItems(role);

  return (
    <div className="no-print fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl flex flex-col">
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          <span className="text-lg font-bold text-primary">VendeMóvil</span>
          <button onClick={onClose} aria-label="Cerrar menú" className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            ✕
          </button>
        </div>
        <div className="px-5 py-3 text-sm text-muted border-b border-border">{userName}</div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                  active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-slate-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-danger hover:bg-red-50"
          >
            <span className="text-base">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
