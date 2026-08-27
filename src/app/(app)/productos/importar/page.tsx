"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { bulkImportProducts } from "@/actions/products.actions";
import type { ProductImportRow } from "@/lib/validations/product.schema";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";

const HEADER_MAP: Record<string, keyof ProductImportRow> = {
  Nombre: "name",
  SKU: "sku",
  "Código de barras": "barcode",
  Categoría: "category",
  Marca: "brand",
  "Precio compra": "purchasePrice",
  "Precio venta": "salePrice",
  Stock: "stock",
  "Stock mínimo": "minStock",
  Unidad: "unit",
};

export default function ImportarProductosPage() {
  const [rows, setRows] = useState<ProductImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created: number; updated: number; errors: { row: number; message: string }[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const mapped: ProductImportRow[] = raw.map((r) => {
      const out: Record<string, unknown> = {};
      for (const [header, value] of Object.entries(r)) {
        const key = HEADER_MAP[header.trim()];
        if (key) out[key] = value;
      }
      return out as ProductImportRow;
    });
    setRows(mapped);
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet([
      {
        Nombre: "Coca Cola 500ml",
        SKU: "BEB-001",
        "Código de barras": "7750243001012",
        Categoría: "Gaseosas",
        Marca: "Coca-Cola",
        "Precio compra": 2.5,
        "Precio venta": 4.0,
        Stock: 48,
        "Stock mínimo": 12,
        Unidad: "unidad",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla_productos.xlsx");
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const res = await bulkImportProducts(rows);
      setResult(res);
      toast.success(`Importación completada: ${res.created} creados, ${res.updated} actualizados`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Importar productos</h1>
        <Link href="/productos"><Button variant="secondary">Volver</Button></Link>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Sube un archivo Excel (.xlsx) o CSV con las columnas: Nombre, SKU, Código de barras, Categoría, Marca,
            Precio compra, Precio venta, Stock, Stock mínimo, Unidad. Si el código de barras o SKU ya existe, el
            producto se actualiza; si no, se crea uno nuevo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={downloadTemplate}>⬇ Descargar plantilla</Button>
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>📁 Elegir archivo</Button>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
          {fileName && <p className="text-sm text-foreground">Archivo: {fileName} ({rows.length} filas)</p>}
        </CardBody>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Vista previa (primeras 10 filas)</h2>
            <Table>
              <Thead>
                <Tr>
                  <Th>Nombre</Th>
                  <Th>SKU</Th>
                  <Th>Precio venta</Th>
                  <Th>Stock</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <Tr key={i}>
                    <Td>{r.name}</Td>
                    <Td>{r.sku}</Td>
                    <Td>{r.salePrice}</Td>
                    <Td>{r.stock}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            <div className="flex justify-end">
              <Button onClick={handleImport} isLoading={isImporting}>Importar {rows.length} productos</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {result && (
        <Card>
          <CardBody className="flex flex-col gap-2">
            <p className="text-sm text-foreground">✅ {result.created} productos creados, {result.updated} actualizados.</p>
            {result.errors.length > 0 && (
              <div className="text-sm text-danger">
                <p>{result.errors.length} filas con errores:</p>
                <ul className="list-disc list-inside">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>Fila {err.row}: {err.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link href="/productos" className="text-primary text-sm hover:underline mt-2">Ver productos →</Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
