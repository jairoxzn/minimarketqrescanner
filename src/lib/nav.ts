import type { Role } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  /** Si se define, solo estos roles ven el ítem (además de ADMIN, que siempre ve todo). */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/pos", label: "Punto de Venta", icon: "🛒" },
  { href: "/caja", label: "Caja", icon: "💰", roles: ["ADMIN", "CAJERO"] },
  { href: "/productos", label: "Productos", icon: "📦" },
  { href: "/categorias", label: "Categorías", icon: "🏷️" },
  { href: "/marcas", label: "Marcas", icon: "🔖" },
  { href: "/inventario", label: "Inventario", icon: "📋" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/ventas", label: "Ventas", icon: "🧾" },
  { href: "/devoluciones", label: "Devoluciones", icon: "↩️" },
  { href: "/reportes/ventas", label: "Reportes", icon: "📊" },
  { href: "/usuarios", label: "Usuarios", icon: "🔐", adminOnly: true },
  { href: "/auditoria", label: "Auditoría", icon: "🕵️", adminOnly: true },
  { href: "/configuracion", label: "Configuración", icon: "⚙️", adminOnly: true },
];

export const MOBILE_TAB_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/pos", label: "Vender", icon: "🛒" },
  { href: "/productos", label: "Productos", icon: "📦" },
  { href: "/ventas", label: "Ventas", icon: "🧾" },
];

export function visibleNavItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (role === "ADMIN") return true;
    if (item.adminOnly) return false;
    if (item.roles && !item.roles.includes(role)) return false;
    return true;
  });
}
