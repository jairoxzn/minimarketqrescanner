import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/** Reads the current session in a Server Component / Server Action. */
export async function getCurrentSession() {
  return getServerSession(authOptions);
}

/** For Server Components: redirects to /login if there's no session. */
export async function requireSessionOrRedirect() {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
