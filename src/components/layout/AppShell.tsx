"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { BottomNav } from "./BottomNav";
import { MobileMenu } from "./MobileMenu";
import type { NotificationItem } from "@/actions/notifications.actions";

export function AppShell({
  role,
  businessName,
  userName,
  notifications,
  children,
}: {
  role: Role;
  businessName: string;
  userName: string;
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <Sidebar role={role} businessName={businessName} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav userName={userName} role={role} onMenuClick={() => setMenuOpen(true)} notifications={notifications} />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
      </div>
      <BottomNav onMore={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} role={role} userName={userName} />
    </div>
  );
}
