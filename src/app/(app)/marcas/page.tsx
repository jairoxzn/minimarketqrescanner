import { listBrands } from "@/actions/brands.actions";
import { BrandsClient } from "./BrandsClient";

export default async function MarcasPage() {
  const brands = await listBrands();
  return <BrandsClient initialBrands={brands} />;
}
