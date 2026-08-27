"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { productSchema, type ProductInput } from "@/lib/validations/product.schema";

type ProductFormValues = z.input<typeof productSchema>;
import { createProduct, updateProduct } from "@/actions/products.actions";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

interface Option {
  id: string;
  name: string;
}

export function ProductForm({
  product,
  categories,
  brands,
  defaultBarcode,
}: {
  product?: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    description: string | null;
    categoryId: string | null;
    brandId: string | null;
    imageUrl: string | null;
    purchasePrice: unknown;
    salePrice: unknown;
    stock: number;
    minStock: number;
    unit: string;
    active: boolean;
  } | null;
  categories: Option[];
  brands: Option[];
  defaultBarcode?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          id: product.id,
          name: product.name,
          sku: product.sku ?? "",
          barcode: product.barcode ?? "",
          description: product.description ?? "",
          categoryId: product.categoryId ?? "",
          brandId: product.brandId ?? "",
          imageUrl: product.imageUrl ?? "",
          purchasePrice: Number(product.purchasePrice),
          salePrice: Number(product.salePrice),
          minStock: product.minStock,
          unit: product.unit,
          active: product.active,
        }
      : {
          name: "",
          sku: "",
          barcode: defaultBarcode ?? "",
          description: "",
          categoryId: "",
          brandId: "",
          imageUrl: "",
          purchasePrice: 0,
          salePrice: 0,
          minStock: 0,
          unit: "unidad",
          active: true,
          initialStock: 0,
        },
  });

  const onSubmit = async (data: ProductInput) => {
    try {
      if (isEditing) {
        await updateProduct({ ...data, id: product!.id });
        toast.success("Producto actualizado");
      } else {
        await createProduct(data);
        toast.success("Producto creado");
      }
      router.push("/productos");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar el producto");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-3xl" noValidate>
      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Información general</h2>
          <Input label="Nombre" required error={errors.name?.message} {...register("name")} />
          <Textarea label="Descripción" error={errors.description?.message} {...register("description")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Categoría" error={errors.categoryId?.message} {...register("categoryId")}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select label="Marca" error={errors.brandId?.message} {...register("brandId")}>
              <option value="">Sin marca</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Identificación</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="SKU" error={errors.sku?.message} {...register("sku")} />
            <Input label="Código de barras" error={errors.barcode?.message} {...register("barcode")} />
          </div>
          <Input label="URL de imagen" placeholder="https://…" error={errors.imageUrl?.message} {...register("imageUrl")} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Precios e inventario</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Precio de compra (S/)"
              type="number"
              step="0.01"
              min="0"
              required
              error={errors.purchasePrice?.message}
              {...register("purchasePrice")}
            />
            <Input
              label="Precio de venta (S/)"
              type="number"
              step="0.01"
              min="0"
              required
              error={errors.salePrice?.message}
              {...register("salePrice")}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {!isEditing && (
              <Input label="Stock inicial" type="number" min="0" {...register("initialStock")} />
            )}
            <Input label="Stock mínimo" type="number" min="0" error={errors.minStock?.message} {...register("minStock")} />
            <Input label="Unidad de medida" placeholder="unidad, kg, caja…" error={errors.unit?.message} {...register("unit")} />
          </div>
          {isEditing && (
            <p className="text-xs text-muted">
              El stock actual ({product?.stock}) se ajusta desde el módulo de Inventario para mantener el historial de movimientos.
            </p>
          )}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("active")} />
            Producto activo
          </label>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" isLoading={isSubmitting}>{isEditing ? "Guardar cambios" : "Crear producto"}</Button>
      </div>
    </form>
  );
}
