import type { Role } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/pos", label: "Punto de Venta", icon: "🛒" },
  { href: "/productos", label: "Productos", icon: "📦" },
  { href: "/categorias", label: "Categorías", icon: "🏷️" },
  { href: "/marcas", label: "Marcas", icon: "🔖" },
  { href: "/inventario", label: "Inventario", icon: "📋" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/ventas", label: "Ventas", icon: "🧾" },
  { href: "/reportes/ventas", label: "Reportes", icon: "📊" },
  { href: "/usuarios", label: "Usuarios", icon: "🔐", adminOnly: true },
  { href: "/configuracion", label: "Configuración", icon: "⚙️", adminOnly: true },
];

export const MOBILE_TAB_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/pos", label: "Vender", icon: "🛒" },
  { href: "/productos", label: "Productos", icon: "📦" },
  { href: "/ventas", label: "Ventas", icon: "🧾" },
];

export function visibleNavItems(role: Role): NavItem[] {
  if (role === "ADMIN") return NAV_ITEMS;
  return NAV_ITEMS.filter((item) => !item.adminOnly);
}
