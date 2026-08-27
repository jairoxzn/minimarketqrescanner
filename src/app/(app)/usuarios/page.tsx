import { listUsers } from "@/actions/users.actions";
import { getCurrentSession } from "@/lib/session";
import { UsersClient } from "./UsersClient";

export default async function UsuariosPage() {
  const [users, session] = await Promise.all([listUsers(), getCurrentSession()]);
  return <UsersClient initialUsers={users} currentUserId={session!.user.id} />;
}
