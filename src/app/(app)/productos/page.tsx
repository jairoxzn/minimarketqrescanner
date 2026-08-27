import { listProducts, type ProductFilters } from "@/actions/products.actions";
import { listCategories } from "@/actions/categories.actions";
import { listBrands } from "@/actions/brands.actions";
import { ProductsClient } from "./ProductsClient";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const filters: ProductFilters = {
    search: sp.search,
    categoryId: sp.categoryId,
    brandId: sp.brandId,
    status: (sp.status as ProductFilters["status"]) || "all",
    stockLevel: (sp.stockLevel as ProductFilters["stockLevel"]) || "all",
  };

  const [products, categories, brands] = await Promise.all([
    listProducts(filters),
    listCategories(),
    listBrands(),
  ]);

  return (
    <ProductsClient
      initialProducts={products}
      categories={categories}
      brands={brands}
      initialFilters={filters}
    />
  );
}
