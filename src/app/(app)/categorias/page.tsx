import { listCategories } from "@/actions/categories.actions";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriasPage() {
  const categories = await listCategories();
  return <CategoriesClient initialCategories={categories} />;
}
