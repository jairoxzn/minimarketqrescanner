"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteProduct, listProducts, type ProductFilters } from "@/actions/products.actions";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatMoney } from "@/lib/money";

type Product = Awaited<ReturnType<typeof listProducts>>[number];
interface Option { id: string; name: string }

export function ProductsClient({
  initialProducts,
  categories,
  brands,
  initialFilters,
}: {
  initialProducts: Product[];
  categories: Option[];
  brands: Option[];
  initialFilters: ProductFilters;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [filters, setFilters] = useState(initialFilters);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const applyFilters = (next: ProductFilters) => {
    setFilters(next);
    const params = new URLSearchParams();
    if (next.search) params.set("search", next.search);
    if (next.categoryId) params.set("categoryId", next.categoryId);
    if (next.brandId) params.set("brandId", next.brandId);
    if (next.status && next.status !== "all") params.set("status", next.status);
    if (next.stockLevel && next.stockLevel !== "all") params.set("stockLevel", next.stockLevel);
    startTransition(async () => {
      const rows = await listProducts(next);
      setProducts(rows);
      router.replace(`/productos?${params.toString()}`, { scroll: false });
    });
  };

  const handleDelete = async (p: Product) => {
    const ok = await confirm("Eliminar producto", `¿Eliminar "${p.name}"?`, true);
    if (!ok) return;
    try {
      const result = await deleteProduct(p.id);
      toast.success(result.hardDeleted ? "Producto eliminado" : "Producto desactivado (tiene ventas registradas)");
      applyFilters(filters);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const rows = products.map((p) => ({
      Nombre: p.name,
      SKU: p.sku ?? "",
      "Código de barras": p.barcode ?? "",
      Categoría: p.category?.name ?? "",
      Marca: p.brand?.name ?? "",
      "Precio compra": Number(p.purchasePrice),
      "Precio venta": Number(p.salePrice),
      Stock: p.stock,
      "Stock mínimo": p.minStock,
      Unidad: p.unit,
      Estado: p.active ? "Activo" : "Inactivo",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, `productos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Productos</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleExport}>⬇ Exportar</Button>
          <Link href="/productos/importar"><Button variant="secondary">⬆ Importar</Button></Link>
          <Link href="/productos/nuevo"><Button>+ Nuevo producto</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-border">
        <Input
          placeholder="Buscar por nombre, SKU o código…"
          defaultValue={filters.search}
          onChange={(e) => applyFilters({ ...filters, search: e.target.value })}
        />
        <Select value={filters.categoryId || ""} onChange={(e) => applyFilters({ ...filters, categoryId: e.target.value })}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={filters.brandId || ""} onChange={(e) => applyFilters({ ...filters, brandId: e.target.value })}>
          <option value="">Todas las marcas</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Select value={filters.status || "all"} onChange={(e) => applyFilters({ ...filters, status: e.target.value as ProductFilters["status"] })}>
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </Select>
        <Select value={filters.stockLevel || "all"} onChange={(e) => applyFilters({ ...filters, stockLevel: e.target.value as ProductFilters["stockLevel"] })}>
          <option value="all">Todo el stock</option>
          <option value="low">Stock bajo</option>
          <option value="out">Agotados</option>
        </Select>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="No se encontraron productos"
          description="Prueba con otros filtros o crea tu primer producto."
          action={<Link href="/productos/nuevo"><Button>+ Nuevo producto</Button></Link>}
        />
      ) : (
        <Table className={isPending ? "opacity-60" : ""}>
          <Thead>
            <Tr>
              <Th>Producto</Th>
              <Th>Categoría</Th>
              <Th>Precio venta</Th>
              <Th>Stock</Th>
              <Th>Estado</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {products.map((p) => {
              const stockTone = p.stock <= 0 ? "danger" : p.stock <= p.minStock ? "warning" : "success";
              const stockLabel = p.stock <= 0 ? "Agotado" : p.stock <= p.minStock ? "Stock bajo" : "OK";
              return (
                <Tr key={p.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-lg border border-border object-cover bg-white shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg border border-dashed border-border shrink-0 flex items-center justify-center text-muted text-xs">📦</div>
                      )}
                      <div>
                        <div className="font-medium text-foreground">{p.name}</div>
                        <div className="text-xs text-muted">{p.sku || p.barcode || "—"}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>{p.category?.name ?? <span className="text-muted">—</span>}</Td>
                  <Td>{formatMoney(Number(p.salePrice))}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span>{p.stock}</span>
                      <Badge tone={stockTone}>{stockLabel}</Badge>
                    </div>
                  </Td>
                  <Td><Badge tone={p.active ? "success" : "default"}>{p.active ? "Activo" : "Inactivo"}</Badge></Td>
                  <Td>
                    <div className="flex gap-2 justify-end">
                      <Link href={`/productos/${p.id}/editar`}><Button size="sm" variant="secondary">Editar</Button></Link>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(p)}>Eliminar</Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
      {dialog}
    </div>
  );
}
