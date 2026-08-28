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
    const handle = setTimeout(() => {
      startTransition(async () => {
        setProducts(await searchProductsForPos(query));
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex gap-2">
        <Input
          placeholder="🔎 Buscar producto por nombre, SKU o código…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={onOpenScanner} className="shrink-0">
          📷 Escanear
        </Button>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto ${isPending ? "opacity-60" : ""}`}>
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
              className="flex flex-col items-start gap-1 rounded-xl border border-border bg-white p-3 text-left hover:border-primary hover:shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="h-16 w-16 rounded-lg border border-border object-cover bg-white self-center" />
              ) : (
                <div className="h-16 w-16 rounded-lg border border-dashed border-border self-center flex items-center justify-center text-muted text-lg">📦</div>
              )}
              <span className="font-medium text-sm text-foreground line-clamp-2">{p.name}</span>
              <span className="text-primary font-bold">{formatMoney(Number(p.salePrice))}</span>
              <span className="text-xs text-muted">{outOfStock ? "Agotado" : `Stock: ${p.stock} ${p.unit}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
