"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/money";
import { buildWhatsappLink, buildWhatsappTicketMessage } from "@/lib/whatsapp";

export interface SaleSuccessData {
  saleId: string;
  ticketLabel: string;
  total: number;
  changeAmount: number | null;
  items: { name: string; quantity: number; subtotal: number }[];
}

/**
 * Pantalla de confirmación tras cobrar — antes la app saltaba directo a la
 * página de ticket imprimible sin ningún paso intermedio. El cajero quiere
 * volver a vender de inmediato la mayoría de las veces, así que esto se
 * queda en el POS (no navega) y solo va al ticket si el cajero lo pide.
 */
export function SaleSuccessModal({
  open,
  sale,
  businessName,
  businessWhatsapp,
  onContinue,
  onViewTicket,
}: {
  open: boolean;
  sale: SaleSuccessData | null;
  businessName: string;
  businessWhatsapp: string | null;
  onContinue: () => void;
  onViewTicket: () => void;
}) {
  if (!sale) return null;

  const handleWhatsapp = () => {
    const message = buildWhatsappTicketMessage({
      businessName,
      ticketLabel: sale.ticketLabel,
      items: sale.items,
      total: sale.total,
    });
    window.open(buildWhatsappLink(message, businessWhatsapp), "_blank");
  };

  return (
    <Modal open={open} onClose={onContinue} size="sm">
      <div className="flex flex-col items-center text-center gap-1 py-2">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <svg className="h-9 w-9 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground">¡Gracias por su compra!</h2>
        <p className="text-3xl font-bold text-primary">{formatMoney(sale.total)}</p>
        {sale.changeAmount != null && sale.changeAmount > 0 && (
          <p className="text-sm text-muted">Vuelto: {formatMoney(sale.changeAmount)}</p>
        )}
        <p className="text-xs text-muted mt-1">Ticket {sale.ticketLabel}</p>

        <div className="flex flex-col gap-2 w-full mt-5">
          <Button size="lg" className="w-full" onClick={onContinue}>
            Seguir vendiendo
          </Button>
          <Button variant="secondary" className="w-full" onClick={handleWhatsapp}>
            💬 Compartir por WhatsApp
          </Button>
          <button
            type="button"
            onClick={onViewTicket}
            className="text-sm text-muted hover:text-foreground hover:underline mt-1"
          >
            Ver / imprimir ticket
          </button>
        </div>
      </div>
    </Modal>
  );
}
