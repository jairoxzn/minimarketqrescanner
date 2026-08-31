"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { serializeDecimals } from "@/lib/serialize";
import { classifyStock } from "@/lib/stock";
import { productSchema, productImportRowSchema, type ProductInput, type ProductImportRow } from "@/lib/validations/product.schema";

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  brandId?: string;
  status?: "active" | "inactive" | "all";
  stockLevel?: "low" | "out" | "all";
}

export async function listProducts(filters: ProductFilters = {}) {
  const session = requirePermission(await getCurrentSession(), "products.view");

  const where: Prisma.ProductWhereInput = { businessId: session.user.businessId };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { sku: { contains: filters.search, mode: "insensitive" } },
      { barcode: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.brandId) where.brandId = filters.brandId;
  if (filters.status === "active") where.active = true;
  if (filters.status === "inactive") where.active = false;

  const products = await prisma.product.findMany({
    where,
    include: { category: true, brand: true },
    orderBy: { name: "asc" },
  });

  if (filters.stockLevel === "low" || filters.stockLevel === "out") {
    const { outOfStock, lowStock } = classifyStock(products);
    return serializeDecimals(filters.stockLevel === "low" ? lowStock : outOfStock);
  }
  return serializeDecimals(products);
}

export async function getProduct(id: string) {
  const session = requirePermission(await getCurrentSession(), "products.view");
  const product = await prisma.product.findFirst({
    where: { id, businessId: session.user.businessId },
    include: { category: true, brand: true },
  });
  return serializeDecimals(product);
}

/** Usado por el POS y el escáner de códigos de barras. */
export async function getProductByBarcode(barcode: string) {
  const session = requirePermission(await getCurrentSession(), "pos.sell");
  const product = await prisma.product.findFirst({
    where: { businessId: session.user.businessId, barcode, active: true },
  });
  return serializeDecimals(product);
}

export async function searchProductsForPos(query: string) {
  const session = requirePermission(await getCurrentSession(), "pos.sell");
  if (!query.trim()) {
    const products = await prisma.product.findMany({
      where: { businessId: session.user.businessId, active: true },
      orderBy: { name: "asc" },
      take: 30,
    });
    return serializeDecimals(products);
  }
  const products = await prisma.product.findMany({
    where: {
      businessId: session.user.businessId,
      active: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
        { barcode: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 30,
  });
  return serializeDecimals(products);
}

export async function createProduct(input: ProductInput) {
  const session = requirePermission(await getCurrentSession(), "products.manage");
  const data = productSchema.parse(input);

  await assertUniqueBarcodeAndSku(session.user.businessId, data);

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        businessId: session.user.businessId,
        name: data.name,
        sku: data.sku || null,
        barcode: data.barcode || null,
        description: data.description || null,
        categoryId: data.categoryId || null,
        brandId: data.brandId || null,
        imageUrl: data.imageUrl || null,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        stock: data.initialStock ?? 0,
        minStock: data.minStock,
        unit: data.unit,
        active: data.active,
      },
    });

    if ((data.initialStock ?? 0) > 0) {
      await tx.inventoryMovement.create({
        data: {
          businessId: session.user.businessId,
          productId: created.id,
          type: "ENTRADA",
          quantity: data.initialStock!,
          previousStock: 0,
          newStock: data.initialStock!,
          reason: "Stock inicial",
          referenceType: "INITIAL",
          userId: session.user.id,
        },
      });
    }

    await writeAuditLog(tx, {
      businessId: session.user.businessId,
      userId: session.user.id,
      action: "PRODUCT_CREATE",
      entityType: "Product",
      entityId: created.id,
    });

    return created;
  });

  revalidatePath("/productos");
  revalidatePath("/inventario");
  return serializeDecimals(product);
}

export async function updateProduct(input: ProductInput) {
  const session = requirePermission(await getCurrentSession(), "products.manage");
  const data = productSchema.parse(input);
  if (!data.id) throw new Error("ID requerido");

  const existing = await prisma.product.findFirst({
    where: { id: data.id, businessId: session.user.businessId },
  });
  if (!existing) throw new Error("Producto no encontrado");

  await assertUniqueBarcodeAndSku(session.user.businessId, data, data.id);

  const product = await prisma.product.update({
    where: { id: data.id },
    data: {
      name: data.name,
      sku: data.sku || null,
      barcode: data.barcode || null,
      description: data.description || null,
      categoryId: data.categoryId || null,
      brandId: data.brandId || null,
      imageUrl: data.imageUrl || null,
      purchasePrice: data.purchasePrice,
      salePrice: data.salePrice,
      minStock: data.minStock,
      unit: data.unit,
      active: data.active,
      // stock intencionalmente no editable aquí — usar /inventario/ajuste para mantener el historial.
    },
  });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "PRODUCT_UPDATE",
    entityType: "Product",
    entityId: product.id,
  });

  revalidatePath("/productos");
  return serializeDecimals(product);
}

export async function deleteProduct(id: string) {
  const session = requirePermission(await getCurrentSession(), "products.delete");

  const existing = await prisma.product.findFirst({
    where: { id, businessId: session.user.businessId },
    include: { _count: { select: { saleItems: true } } },
  });
  if (!existing) throw new Error("Producto no encontrado");

  if (existing._count.saleItems > 0) {
    // Tiene historial de ventas: no se puede borrar sin romper la integridad de reportes/tickets pasados.
    await prisma.product.update({ where: { id }, data: { active: false } });
    await writeAuditLog(prisma, {
      businessId: session.user.businessId,
      userId: session.user.id,
      action: "PRODUCT_DEACTIVATE",
      entityType: "Product",
      entityId: id,
    });
    revalidatePath("/productos");
    return { hardDeleted: false as const };
  }

  await prisma.inventoryMovement.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });

  await writeAuditLog(prisma, {
    businessId: session.user.businessId,
    userId: session.user.id,
    action: "PRODUCT_DELETE",
    entityType: "Product",
    entityId: id,
  });

  revalidatePath("/productos");
  return { hardDeleted: true as const };
}

async function assertUniqueBarcodeAndSku(
  businessId: string,
  data: Pick<ProductInput, "barcode" | "sku">,
  excludeId?: string
) {
  if (data.barcode) {
    const dup = await prisma.product.findFirst({
      where: { businessId, barcode: data.barcode, id: excludeId ? { not: excludeId } : undefined },
    });
    if (dup) throw new Error("Ya existe un producto con ese código de barras");
  }
  if (data.sku) {
    const dup = await prisma.product.findFirst({
      where: { businessId, sku: data.sku, id: excludeId ? { not: excludeId } : undefined },
    });
    if (dup) throw new Error("Ya existe un producto con ese SKU");
  }
}

export async function bulkImportProducts(rows: ProductImportRow[]) {
  const session = requirePermission(await getCurrentSession(), "products.manage");

  const businessId = session.user.businessId;
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ where: { businessId } }),
    prisma.brand.findMany({ where: { businessId } }),
  ]);
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const brandByName = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));

  let created = 0;
  let updated = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = productImportRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errors.push({ row: i + 2, message: parsed.error.issues[0]?.message ?? "Fila inválida" });
      continue;
    }
    const row = parsed.data;

    try {
      const categoryId = row.category ? categoryByName.get(row.category.toLowerCase()) : undefined;
      const brandId = row.brand ? brandByName.get(row.brand.toLowerCase()) : undefined;

      const existing = row.barcode
        ? await prisma.product.findFirst({ where: { businessId, barcode: row.barcode } })
        : row.sku
          ? await prisma.product.findFirst({ where: { businessId, sku: row.sku } })
          : null;

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            categoryId: categoryId ?? existing.categoryId,
            brandId: brandId ?? existing.brandId,
            purchasePrice: row.purchasePrice,
            salePrice: row.salePrice,
            minStock: row.minStock,
            unit: row.unit || existing.unit,
          },
        });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            businessId,
            name: row.name,
            sku: row.sku || null,
            barcode: row.barcode || null,
            categoryId: categoryId ?? null,
            brandId: brandId ?? null,
            purchasePrice: row.purchasePrice,
            salePrice: row.salePrice,
            stock: row.stock,
            minStock: row.minStock,
            unit: row.unit || "unidad",
          },
        });
        created++;
      }
    } catch {
      errors.push({ row: i + 2, message: "Error al guardar la fila" });
    }
  }

  await writeAuditLog(prisma, {
    businessId,
    userId: session.user.id,
    action: "PRODUCT_BULK_IMPORT",
    entityType: "Product",
    metadata: { created, updated, errors: errors.length },
  });

  revalidatePath("/productos");
  return { created, updated, errors };
}
