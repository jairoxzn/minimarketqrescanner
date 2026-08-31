"use client";

import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import { NotificationBell } from "./NotificationBell";
import type { NotificationItem } from "@/actions/notifications.actions";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  CAJERO: "Cajero",
};

export function TopNav({
  userName,
  role,
  onMenuClick,
  notifications,
}: {
  userName: string;
  role: Role;
  onMenuClick: () => void;
  notifications: NotificationItem[];
}) {
  return (
    <header className="no-print sticky top-0 z-30 h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-lg"
        >
          ☰
        </button>
        <span className="lg:hidden font-bold text-primary">VendeMóvil</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <NotificationBell initialNotifications={notifications} />
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-medium text-foreground">{userName}</span>
          <span className="text-xs text-muted">{ROLE_LABEL[role]}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="h-9 px-3 rounded-lg text-sm font-medium text-danger hover:bg-red-50"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
