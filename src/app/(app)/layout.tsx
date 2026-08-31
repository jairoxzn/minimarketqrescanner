import { requireSessionOrRedirect } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { getNotifications } from "@/actions/notifications.actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionOrRedirect();

  const [business, notifications] = await Promise.all([
    prisma.business.findUnique({ where: { id: session.user.businessId }, select: { name: true } }),
    // getNotifications() falla en silencio hacia una lista vacía — es una
    // conveniencia decorativa (la campanita), no debe poder tumbar cada
    // página de la app entera si hay un error transitorio de base de datos.
    getNotifications().catch(() => []),
  ]);

  return (
    <AppShell
      role={session.user.role}
      businessName={business?.name ?? "VendeMóvil"}
      userName={session.user.name ?? session.user.email ?? ""}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
