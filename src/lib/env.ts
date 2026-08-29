/**
 * Valida variables de entorno requeridas con un mensaje claro y accionable.
 *
 * Sin esto, si falta DATABASE_URL en producción (ej. recién desplegado en
 * Vercel sin configurar las variables), Prisma/NextAuth fallan con un error
 * interno genérico — el navegador solo ve "Unexpected token '<' ... is not
 * valid JSON" (el cliente de NextAuth esperando JSON de /api/auth/session y
 * recibiendo la página de error HTML de Next.js). Con esto, el error real
 * queda en los logs del servidor (Vercel → el proyecto → Logs) apenas se
 * intenta usar la variable faltante, en vez de un stack trace críptico.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno "${name}". ` +
        `Si esto corre en Vercel: Project Settings → Environment Variables, agrégala (Production/Preview/Development según corresponda) y vuelve a desplegar — agregar la variable sola no aplica a un build ya hecho.`
    );
  }
  return value;
}
