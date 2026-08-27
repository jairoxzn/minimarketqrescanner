import { notFound } from "next/navigation";
import { getProduct } from "@/actions/products.actions";
import { listCategories } from "@/actions/categories.actions";
import { listBrands } from "@/actions/brands.actions";
import { ProductForm } from "@/components/products/ProductForm";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, brands] = await Promise.all([getProduct(id), listCategories(), listBrands()]);

  if (!product) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">Editar producto</h1>
      <ProductForm product={product} categories={categories} brands={brands} />
    </div>
  );
}
