import { requireSessionOrRedirect } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionOrRedirect();

  const business = await prisma.business.findUnique({
    where: { id: session.user.businessId },
    select: { name: true },
  });

  return (
    <AppShell role={session.user.role} businessName={business?.name ?? "VendeMóvil"} userName={session.user.name ?? session.user.email ?? ""}>
      {children}
    </AppShell>
  );
}
