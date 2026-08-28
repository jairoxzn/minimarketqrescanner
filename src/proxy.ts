import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Coarse route gating for UX only. The real security boundary is
// lib/permissions.ts, re-checked inside every Server Action.
const ADMIN_ONLY_PREFIXES = ["/usuarios", "/configuracion", "/auditoria", "/compras", "/proveedores"];
const ADMIN_OR_CAJERO_PREFIXES = ["/caja"];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const needsAdmin = ADMIN_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (needsAdmin && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const needsAdminOrCajero = ADMIN_OR_CAJERO_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (needsAdminOrCajero && token?.role !== "ADMIN" && token?.role !== "CAJERO") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - /login, /forgot-password, /reset-password (public auth pages)
     * - /api/auth (NextAuth internal routes)
     * - /_next (Next.js internals)
     * - static files (favicon, images, etc.)
     */
    "/((?!login|forgot-password|reset-password|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
