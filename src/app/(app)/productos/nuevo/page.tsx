import { listCategories } from "@/actions/categories.actions";
import { listBrands } from "@/actions/brands.actions";
import { ProductForm } from "@/components/products/ProductForm";

export default async function NuevoProductoPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  const [{ barcode }, categories, brands] = await Promise.all([searchParams, listCategories(), listBrands()]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">Nuevo producto</h1>
      <ProductForm categories={categories} brands={brands} defaultBarcode={barcode} />
    </div>
  );
}
