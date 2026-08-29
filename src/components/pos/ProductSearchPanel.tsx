"use client";

import { useEffect, useState, useTransition } from "react";
import { searchProductsForPos } from "@/actions/products.actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";

type Product = Awaited<ReturnType<typeof searchProductsForPos>>[number];

export function ProductSearchPanel({
  initialProducts,
  onAdd,
  onOpenScanner,
}: {
  initialProducts: Product[];
  onAdd: (product: Product) => void;
  onOpenScanner: () => void;
}) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState(initialProducts);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // El POS ahora se queda en la misma pantalla tras una venta (no navega al
    // ticket), así que router.refresh() es la única forma de refrescar el
    // stock mostrado aquí. Solo aplica cuando no hay una búsqueda activa,
    // para no pisar resultados de búsqueda con la lista por defecto.
    if (query.trim() === "") setProducts(initialProducts);
  }, [initialProducts, query]);

  useEffect(() => {
    const handle = setTimeout(() => {
      startTransition(async () => {
        setProducts(await searchProductsForPos(query));
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex gap-2">
        <Input
          placeholder="🔎 Buscar producto por nombre, SKU o código…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-white"
        />
        <Button type="button" variant="accent" onClick={onOpenScanner} className="shrink-0">
          📷 Escanear
        </Button>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 overflow-y-auto pb-2 ${isPending ? "opacity-60" : ""}`}>
        {products.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted py-8">No se encontraron productos.</p>
        )}
        {products.map((p) => {
          const outOfStock = p.stock <= 0;
          return (
            <button
              key={p.id}
              type="button"
              disabled={outOfStock}
              onClick={() => onAdd(p)}
              className="group relative flex flex-col items-stretch gap-2 rounded-2xl border border-border bg-white p-3 text-left shadow-sm shadow-slate-900/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-background">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-3xl text-muted">📦</div>
                )}
                {!outOfStock && (
                  <span className="absolute bottom-1.5 right-1.5 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-bold shadow-sm transition-transform group-hover:scale-110">
                    +
                  </span>
                )}
                {outOfStock && (
                  <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-semibold text-danger">
                    Agotado
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 px-0.5">
                <span className="font-medium text-sm text-foreground line-clamp-2 leading-snug">{p.name}</span>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold">{formatMoney(Number(p.salePrice))}</span>
                  {!outOfStock && <span className="text-[11px] text-muted">Stock {p.stock}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
