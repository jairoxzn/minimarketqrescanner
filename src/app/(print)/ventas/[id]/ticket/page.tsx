import { notFound } from "next/navigation";
import { getSaleForTicket } from "@/actions/sales.actions";
import { TicketView, type TicketViewData } from "@/components/tickets/TicketView";

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ size?: string }>;
}) {
  const [{ id }, { size }] = await Promise.all([params, searchParams]);
  const sale = await getSaleForTicket(id);
  if (!sale) notFound();

  const paymentLabel = sale.payments.map((p) => p.paymentMethod.name).join(" + ") || "—";

  const ticket: TicketViewData = {
    saleId: sale.id,
    ticketLabel: `${sale.ticketSeries}-${String(sale.ticketNumber).padStart(6, "0")}`,
    createdAt: sale.createdAt.toLocaleString("es-PE"),
    cashierName: sale.user.name,
    customerName: sale.customer.name,
    businessName: sale.business.name,
    businessAddress: sale.business.address,
    businessPhone: sale.business.phone,
    businessWhatsapp: sale.business.whatsapp,
    businessRuc: sale.business.ruc,
    items: sale.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })),
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    total: Number(sale.total),
    paymentLabel,
    amountReceived: sale.amountReceived != null ? Number(sale.amountReceived) : null,
    changeAmount: sale.changeAmount != null ? Number(sale.changeAmount) : null,
    status: sale.status,
  };

  return <TicketView sale={ticket} widthMm={size === "58mm" ? 58 : 80} />;
}
