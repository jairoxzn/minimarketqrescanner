import Link from "next/link";
import { listInventoryOverview } from "@/actions/inventory.actions";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { classifyStock } from "@/lib/stock";

export default async function InventarioPage() {
  const products = await listInventoryOverview();
  const { outOfStock, lowStock } = classifyStock(products);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Inventario</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventario/movimientos"><Button variant="secondary">Ver movimientos</Button></Link>
          <Link href="/inventario/ajuste"><Button>+ Entrada / Ajuste</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardBody>
          <p className="text-sm text-muted">Total de productos</p>
          <p className="text-2xl font-bold text-foreground">{products.length}</p>
        </CardBody></Card>
        <Card><CardBody>
          <p className="text-sm text-muted">Stock bajo</p>
          <p className="text-2xl font-bold text-warning">{lowStock.length}</p>
        </CardBody></Card>
        <Card><CardBody>
          <p className="text-sm text-muted">Agotados</p>
          <p className="text-2xl font-bold text-danger">{outOfStock.length}</p>
        </CardBody></Card>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Producto</Th>
            <Th>Categoría</Th>
            <Th>Stock actual</Th>
            <Th>Stock mínimo</Th>
            <Th>Estado</Th>
          </Tr>
        </Thead>
        <Tbody>
          {products.map((p) => {
            const tone = p.stock <= 0 ? "danger" : p.stock <= p.minStock ? "warning" : "success";
            const label = p.stock <= 0 ? "Agotado" : p.stock <= p.minStock ? "Stock bajo" : "Normal";
            return (
              <Tr key={p.id}>
                <Td className="font-medium">{p.name}</Td>
                <Td>{p.category?.name ?? <span className="text-muted">—</span>}</Td>
                <Td>{p.stock} {p.unit}</Td>
                <Td>{p.minStock}</Td>
                <Td><Badge tone={tone}>{label}</Badge></Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
}
