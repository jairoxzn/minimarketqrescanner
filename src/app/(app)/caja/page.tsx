import Link from "next/link";
import { getCurrentRegister } from "@/actions/cash.actions";
import { Button } from "@/components/ui/Button";
import { CajaClient } from "./CajaClient";

export default async function CajaPage() {
  const current = await getCurrentRegister();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Caja</h1>
        <Link href="/caja/historial"><Button variant="secondary">Ver historial</Button></Link>
      </div>
      <CajaClient initial={current} />
    </div>
  );
}
