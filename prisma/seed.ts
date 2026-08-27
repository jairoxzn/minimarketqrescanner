import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "admin@vendemovil.pe";
const ADMIN_PASSWORD = "Admin123!";

async function main() {
  console.log("Seeding VendeMóvil...");

  const business = await prisma.business.upsert({
    where: { id: "seed-business-1" },
    update: {},
    create: {
      id: "seed-business-1",
      name: "Minimarket Demo",
      legalName: "Minimarket Demo S.A.C.",
      ruc: "20123456789",
      address: "Av. Principal 123, Lima",
      phone: "01-2345678",
      whatsapp: "51987654321",
      email: "contacto@minimarketdemo.pe",
      currency: "PEN",
      currencySymbol: "S/",
      igvEnabled: true,
      igvPercent: 18.0,
      igvIncluded: true,
      ticketSeries: "B001",
      allowNegativeStock: false,
    },
  });

  await prisma.ticketCounter.upsert({
    where: { businessId: business.id },
    update: {},
    create: {
      businessId: business.id,
      series: business.ticketSeries,
      current: 0,
    },
  });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      businessId: business.id,
      name: "Administrador",
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  await prisma.customer.upsert({
    where: { businessId_docNumber: { businessId: business.id, docNumber: "GENERAL" } },
    update: {},
    create: {
      businessId: business.id,
      name: "Cliente General",
      docType: "NONE",
      docNumber: "GENERAL",
      isGeneral: true,
    },
  });

  const paymentMethods = [
    { code: "efectivo", name: "Efectivo", sortOrder: 1 },
    { code: "yape", name: "Yape", sortOrder: 2 },
    { code: "plin", name: "Plin", sortOrder: 3 },
    { code: "tarjeta", name: "Tarjeta", sortOrder: 4 },
    { code: "transferencia", name: "Transferencia", sortOrder: 5 },
    { code: "otros", name: "Otros", sortOrder: 6 },
  ];
  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { businessId_code: { businessId: business.id, code: pm.code } },
      update: {},
      create: { businessId: business.id, ...pm },
    });
  }

  const bebidas = await prisma.category.upsert({
    where: { id: "seed-cat-bebidas" },
    update: {},
    create: { id: "seed-cat-bebidas", businessId: business.id, name: "Bebidas" },
  });
  const gaseosas = await prisma.category.upsert({
    where: { id: "seed-cat-gaseosas" },
    update: {},
    create: {
      id: "seed-cat-gaseosas",
      businessId: business.id,
      name: "Gaseosas",
      parentId: bebidas.id,
    },
  });
  const abarrotes = await prisma.category.upsert({
    where: { id: "seed-cat-abarrotes" },
    update: {},
    create: { id: "seed-cat-abarrotes", businessId: business.id, name: "Abarrotes" },
  });

  const cocaCola = await prisma.brand.upsert({
    where: { id: "seed-brand-cocacola" },
    update: {},
    create: { id: "seed-brand-cocacola", businessId: business.id, name: "Coca-Cola" },
  });
  const genericBrand = await prisma.brand.upsert({
    where: { id: "seed-brand-generico" },
    update: {},
    create: { id: "seed-brand-generico", businessId: business.id, name: "Genérico" },
  });

  const demoProducts = [
    {
      id: "seed-prod-cocacola-500",
      name: "Coca Cola 500ml",
      barcode: "7750243001012",
      sku: "BEB-001",
      categoryId: gaseosas.id,
      brandId: cocaCola.id,
      purchasePrice: 2.5,
      salePrice: 4.0,
      stock: 48,
      minStock: 12,
      unit: "unidad",
    },
    {
      id: "seed-prod-arroz-5kg",
      name: "Arroz Extra 5kg",
      barcode: "7750243002019",
      sku: "ABA-001",
      categoryId: abarrotes.id,
      brandId: genericBrand.id,
      purchasePrice: 18.0,
      salePrice: 24.5,
      stock: 20,
      minStock: 5,
      unit: "unidad",
    },
    {
      id: "seed-prod-azucar-1kg",
      name: "Azúcar Rubia 1kg",
      barcode: "7750243003026",
      sku: "ABA-002",
      categoryId: abarrotes.id,
      brandId: genericBrand.id,
      purchasePrice: 3.2,
      salePrice: 4.5,
      stock: 3,
      minStock: 10,
      unit: "unidad",
    },
  ];

  for (const p of demoProducts) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: { businessId: business.id, ...p },
    });
  }

  console.log("Seed completado.");
  console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
