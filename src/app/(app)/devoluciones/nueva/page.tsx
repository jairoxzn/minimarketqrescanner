import { NuevaDevolucionClient } from "./NuevaDevolucionClient";

export default async function NuevaDevolucionPage({
  searchParams,
}: {
  searchParams: Promise<{ saleId?: string }>;
}) {
  const { saleId } = await searchParams;
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-xl font-bold text-foreground">Nueva devolución</h1>
      <NuevaDevolucionClient initialSaleId={saleId} />
    </div>
  );
}
