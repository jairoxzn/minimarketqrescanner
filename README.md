# VendeMóvil

Sistema POS web responsive para pequeños y medianos negocios en Perú.
**"Tu negocio, tus ventas, desde cualquier navegador."**

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 (driver adapter `@prisma/adapter-pg`) · PostgreSQL (Neon) · NextAuth v4 (Credentials + JWT) · Zod · React Hook Form · Recharts · jsPDF · SheetJS (xlsx) · BarcodeDetector API con fallback `@zxing/browser`.

## Setup

```bash
npm install
cp .env.example .env   # completar DATABASE_URL, DATABASE_URL_UNPOOLED, NEXTAUTH_SECRET
npx prisma migrate deploy   # o `prisma migrate dev` en desarrollo
npx prisma db seed
npm run dev
```

`DATABASE_URL` debe ser la conexión **pooled** de Neon (usada en runtime); `DATABASE_URL_UNPOOLED` la conexión **directa** (usada por Prisma CLI para migraciones — ver `prisma.config.ts`).

Genera `NEXTAUTH_SECRET` con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Usuario administrador de prueba (sembrado)

```
admin@vendemovil.pe / Admin123!
```

Cámbiala desde `/usuarios` (o pide a otro admin que la restablezca) antes de usar el sistema en producción.

## Roles

| Rol | Puede |
|---|---|
| **Administrador** | Todo — productos, usuarios, caja de configuración, anular ventas, ver todas las ventas. |
| **Vendedor** | Vender en el POS, ver/crear/editar clientes, ver solo sus propias ventas, ver inventario/productos (sin editar). |
| **Cajero** | Todo lo de Vendedor, más abrir/cerrar caja y registrar ingresos/egresos/retiros en `/caja`. |

La autorización real vive en `src/lib/permissions.ts` y se re-verifica dentro de cada Server Action; el middleware (`src/proxy.ts`) solo hace un filtrado grueso de rutas por conveniencia de UX.

## Alcance de este MVP

Incluye todo lo listado como "obligatorio" en el PRD: Login, Dashboard, Productos, Categorías/Marcas, Inventario, POS Web (con escáner de cámara), Clientes, Métodos de pago, Tickets (impresión térmica 58/80mm + PDF + WhatsApp), Historial de ventas + anulación, Usuarios/Roles, Reporte de ventas (+ versión ligera de productos/ganancias), Configuración del negocio, y diseño responsive (móvil/tablet/desktop).

De la etapa 2 del PRD, ya se agregó:

- **Control de caja** (`/caja`, `/caja/historial`): apertura con monto inicial, ingresos/egresos/retiros, cierre con arqueo (dinero contado vs. total esperado = inicial + ventas en efectivo + ingresos − egresos − retiros) y diferencia. El dashboard muestra "Egresos de caja (mes)" con datos reales en vez del placeholder original del MVP.
- **Devoluciones** (`/devoluciones`, `/devoluciones/nueva`): buscar una venta activa por N° de ticket o cliente (o entrar desde el botón "Registrar devolución" en el detalle de una venta), elegir cantidad a devolver por producto (con tope automático = vendido − ya devuelto), motivo obligatorio, y actualización automática de inventario con un movimiento de tipo `DEVOLUCION` (el PRD §9 define 4 tipos de movimiento — Entrada/Salida/Ajuste/Devolución — el enum original solo tenía 3; se corrigió al construir este módulo). Cualquier rol de venta (Vendedor, Cajero, Admin) puede procesar devoluciones, no solo Admin. La devolución no reabre ni ajusta el total de la venta original — solo repone stock y deja un registro auditable, tal como lo describe el diagrama de flujo del PRD.

**No incluido todavía** (resto de la etapa 2/3 del PRD): Compras/Proveedores, Multiempresa/SuperAdmin, Suscripciones, Facturación electrónica, Modo offline.

### Decisiones de alcance tomadas durante la construcción

- **NextAuth v4** (estable) en vez de v5/Auth.js (aún en beta).
- **Imagen de producto = URL únicamente** — no hay credenciales de storage (S3/Cloudinary/Vercel Blob) configuradas.
- **Recuperar contraseña**: el flujo por token existe (`/forgot-password`, `/reset-password/[token]`), pero sin `SMTP_*` configurado el enlace solo se registra en la consola del servidor. El camino práctico en el MVP es que un administrador restablezca la contraseña desde `/usuarios`.
- **Stock negativo bloqueado por defecto** (`Business.allowNegativeStock`, configurable en `/configuracion`).
- **Precios con IGV incluido por defecto** (`igvIncluded = true`), configurable.
- Toda tabla de negocio lleva `businessId` (preparado para multiempresa a futuro) aunque el MVP siembra un solo `Business`.
- **Caja**: una sola caja abierta por negocio a la vez (no una por usuario/terminal — coincide con el modelo del PRD, que menciona multi-caja recién en el plan Premium). Las ventas del POS **no** requieren una caja abierta para registrarse — Vendedor puede vender sin usar caja; Cajero/Admin usan `/caja` para el arqueo de efectivo cuando lo necesiten.

## Estructura

```
prisma/schema.prisma      Esquema completo (ver plan de implementación)
prisma/seed.ts             Negocio demo, admin, Cliente General, métodos de pago, catálogo de ejemplo
src/actions/                Server Actions (una por dominio) — mutaciones + queries autorizadas
src/app/(auth)/              Login, recuperar/restablecer contraseña
src/app/(app)/                Todo el panel autenticado (sidebar + bottom nav)
src/app/(print)/               Ruta de ticket sin chrome de la app, para imprimir/compartir
src/components/              UI kit, POS, escáner, gráficos, tickets
src/lib/                     prisma, auth, permisos, auditoría, dinero/IGV, fechas (zona horaria Lima)
```

## Verificación

Se ejecutaron flujos end-to-end reales contra la base de datos Neon (login → POS → venta → ticket → stock → anulación; apertura/movimientos/cierre de caja con arqueo; venta → devolución parcial → stock repuesto) en escritorio y móvil (390×844), sin errores de consola. Esto encontró y corrigió bugs reales antes de la entrega (ver historial de commits) — no fue solo revisión de código. Como resultado quedan en la base de datos sembrada varias ventas, cierres de caja y devoluciones de prueba — bórralas manualmente desde sus respectivas pantallas, o re-siembra la base de datos si prefieres partir de datos completamente limpios.
