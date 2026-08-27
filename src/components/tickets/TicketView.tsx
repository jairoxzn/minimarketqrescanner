"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadTicketPdf } from "@/lib/pdf/ticketPdf";
import { buildWhatsappLink, buildWhatsappTicketMessage } from "@/lib/whatsapp";
import { formatMoney } from "@/lib/money";

export interface TicketViewData {
  saleId: string;
  ticketLabel: string;
  createdAt: string;
  cashierName: string;
  customerName: string;
  businessName: string;
  businessAddress: string | null;
  businessPhone: string | null;
  businessWhatsapp: string | null;
  businessRuc: string | null;
  items: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentLabel: string;
  amountReceived: number | null;
  changeAmount: number | null;
  status: "ACTIVE" | "VOID";
}

export function TicketView({ sale, widthMm }: { sale: TicketViewData; widthMm: 58 | 80 }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadTicketPdf({
        businessName: sale.businessName,
        businessAddress: sale.businessAddress,
        businessPhone: sale.businessPhone,
        businessRuc: sale.businessRuc,
        ticketLabel: sale.ticketLabel,
        date: sale.createdAt,
        cashier: sale.cashierName,
        customer: sale.customerName,
        items: sale.items,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        paymentLabel: sale.paymentLabel,
        amountReceived: sale.amountReceived,
        changeAmount: sale.changeAmount,
        widthMm,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsapp = () => {
    const message = buildWhatsappTicketMessage({
      businessName: sale.businessName,
      ticketLabel: sale.ticketLabel,
      items: sale.items,
      total: sale.total,
      ticketUrl:
        typeof window !== "undefined" ? window.location.href.split("?")[0] : undefined,
    });
    window.open(buildWhatsappLink(message, sale.businessWhatsapp), "_blank");
  };

  return (
    <>
      <style>{`@page { size: ${widthMm}mm auto; margin: 0; }`}</style>

      <div className="no-print flex flex-col gap-3 w-full max-w-xs mb-4">
        {sale.status === "VOID" && (
          <div className="rounded-lg bg-red-100 text-danger text-sm font-semibold text-center py-2">
            VENTA ANULADA
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => window.print()}>🖨️ Imprimir</Button>
          <Button variant="secondary" onClick={handleDownload} isLoading={isDownloading}>⬇ PDF</Button>
          <Button variant="secondary" onClick={handleWhatsapp}>💬 WhatsApp</Button>
          <Link href={`/ventas/${sale.saleId}`}><Button variant="secondary" className="w-full">← Volver</Button></Link>
        </div>
        <div className="flex justify-center gap-3 text-xs text-muted">
          <Link href={`?size=58mm`} className={widthMm === 58 ? "text-primary font-medium" : "hover:underline"}>58mm</Link>
          <Link href={`?size=80mm`} className={widthMm === 80 ? "text-primary font-medium" : "hover:underline"}>80mm</Link>
        </div>
      </div>

      <div
        className="ticket bg-white text-black font-mono text-[11px] leading-tight p-3 shadow-sm"
        style={{ width: `${widthMm}mm` }}
      >
        <div className="text-center font-bold text-sm">{sale.businessName}</div>
        {sale.businessAddress && <div className="text-center">{sale.businessAddress}</div>}
        {sale.businessPhone && <div className="text-center">Tel: {sale.businessPhone}</div>}
        {sale.businessRuc && <div className="text-center">RUC: {sale.businessRuc}</div>}

        <div className="border-t border-dashed border-black my-1.5" />

        <div className="font-bold">Ticket {sale.ticketLabel}</div>
        <div>{sale.createdAt}</div>
        <div>Cajero: {sale.cashierName}</div>
        <div>Cliente: {sale.customerName}</div>

        <div className="border-t border-dashed border-black my-1.5" />

        {sale.items.map((item, i) => (
          <div key={i} className="mb-1">
            <div>{item.name}</div>
            <div className="flex justify-between">
              <span>&nbsp;&nbsp;{item.quantity} x {formatMoney(item.unitPrice)}</span>
              <span>{formatMoney(item.subtotal)}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-dashed border-black my-1.5" />

        <div className="flex justify-between"><span>Subtotal:</span><span>{formatMoney(sale.subtotal)}</span></div>
        {sale.discount > 0 && (
          <div className="flex justify-between"><span>Descuento:</span><span>{formatMoney(sale.discount)}</span></div>
        )}
        <div className="flex justify-between font-bold text-sm mt-1"><span>TOTAL:</span><span>{formatMoney(sale.total)}</span></div>

        <div className="mt-1.5">
          <div className="flex justify-between"><span>Pago:</span><span>{sale.paymentLabel}</span></div>
          {sale.amountReceived != null && (
            <div className="flex justify-between"><span>Recibido:</span><span>{formatMoney(sale.amountReceived)}</span></div>
          )}
          {sale.changeAmount != null && (
            <div className="flex justify-between"><span>Vuelto:</span><span>{formatMoney(sale.changeAmount)}</span></div>
          )}
        </div>

        <div className="text-center mt-2">¡Gracias por su compra!</div>
      </div>
    </>
  );
}
