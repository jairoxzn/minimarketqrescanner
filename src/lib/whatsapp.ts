export function buildWhatsappTicketMessage(params: {
  businessName: string;
  ticketLabel: string;
  items: { name: string; quantity: number; subtotal: number }[];
  total: number;
  ticketUrl?: string;
}) {
  const lines = [
    `*${params.businessName}*`,
    `Ticket ${params.ticketLabel}`,
    "",
    ...params.items.map((i) => `${i.quantity}x ${i.name} - S/ ${i.subtotal.toFixed(2)}`),
    "",
    `*TOTAL: S/ ${params.total.toFixed(2)}*`,
  ];
  if (params.ticketUrl) {
    lines.push("", params.ticketUrl);
  }
  lines.push("", "¡Gracias por su compra!");
  return lines.join("\n");
}

/** phone en formato internacional sin '+' (ej. 51987654321). Si no hay teléfono, abre el selector de contacto de WhatsApp. */
export function buildWhatsappLink(message: string, phone?: string | null) {
  const text = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}
