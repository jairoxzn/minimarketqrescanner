import type { Role } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  section: string;
  adminOnly?: boolean;
  /** Si se define, solo estos roles ven el ítem (además de ADMIN, que siempre ve todo). */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠", section: "Principal" },
  { href: "/pos", label: "Punto de Venta", icon: "🛒", section: "Principal" },
  { href: "/caja", label: "Caja", icon: "💰", section: "Principal", roles: ["ADMIN", "CAJERO"] },

  { href: "/productos", label: "Productos", icon: "📦", section: "Catálogo" },
  { href: "/categorias", label: "Categorías", icon: "🏷️", section: "Catálogo" },
  { href: "/marcas", label: "Marcas", icon: "🔖", section: "Catálogo" },
  { href: "/inventario", label: "Inventario", icon: "📋", section: "Catálogo" },
  { href: "/compras", label: "Compras", icon: "🚚", section: "Catálogo", adminOnly: true },
  { href: "/proveedores", label: "Proveedores", icon: "🏭", section: "Catálogo", adminOnly: true },

  { href: "/clientes", label: "Clientes", icon: "👥", section: "Ventas" },
  { href: "/ventas", label: "Ventas", icon: "🧾", section: "Ventas" },
  { href: "/devoluciones", label: "Devoluciones", icon: "↩️", section: "Ventas" },

  { href: "/reportes/ventas", label: "Reportes", icon: "📊", section: "Gestión" },
  { href: "/usuarios", label: "Usuarios", icon: "🔐", section: "Gestión", adminOnly: true },
  { href: "/auditoria", label: "Auditoría", icon: "🕵️", section: "Gestión", adminOnly: true },
  { href: "/configuracion", label: "Configuración", icon: "⚙️", section: "Gestión", adminOnly: true },
];

export const MOBILE_TAB_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: "🏠", section: "Principal" },
  { href: "/pos", label: "Vender", icon: "🛒", section: "Principal" },
  { href: "/productos", label: "Productos", icon: "📦", section: "Principal" },
  { href: "/ventas", label: "Ventas", icon: "🧾", section: "Principal" },
];

export function visibleNavItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (role === "ADMIN") return true;
    if (item.adminOnly) return false;
    if (item.roles && !item.roles.includes(role)) return false;
    return true;
  });
}

/** Agrupa los ítems visibles por sección, preservando el orden y omitiendo secciones vacías. */
export function visibleNavSections(role: Role): { section: string; items: NavItem[] }[] {
  const items = visibleNavItems(role);
  const sections: { section: string; items: NavItem[] }[] = [];
  for (const item of items) {
    let group = sections.find((s) => s.section === item.section);
    if (!group) {
      group = { section: item.section, items: [] };
      sections.push(group);
    }
    group.items.push(item);
  }
  return sections;
}
