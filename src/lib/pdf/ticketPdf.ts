export interface TicketPdfData {
  businessName: string;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessRuc?: string | null;
  ticketLabel: string;
  date: string;
  cashier: string;
  customer: string;
  items: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentLabel: string;
  amountReceived?: number | null;
  changeAmount?: number | null;
  widthMm?: number;
}

export async function downloadTicketPdf(data: TicketPdfData) {
  const { jsPDF } = await import("jspdf");
  const widthMm = data.widthMm ?? 80;
  const lineHeight = 4.2;
  const estimatedHeight = 55 + data.items.length * lineHeight + 30;

  const doc = new jsPDF({ unit: "mm", format: [widthMm, estimatedHeight] });
  const marginX = 4;
  let y = 8;
  const centerX = widthMm / 2;

  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.text(data.businessName, centerX, y, { align: "center" });
  y += 4.5;

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  if (data.businessAddress) {
    doc.text(data.businessAddress, centerX, y, { align: "center" });
    y += 3.5;
  }
  if (data.businessPhone) {
    doc.text(`Tel: ${data.businessPhone}`, centerX, y, { align: "center" });
    y += 3.5;
  }
  if (data.businessRuc) {
    doc.text(`RUC: ${data.businessRuc}`, centerX, y, { align: "center" });
    y += 3.5;
  }

  y += 1;
  doc.text("-".repeat(widthMm === 58 ? 32 : 42), centerX, y, { align: "center" });
  y += 4;

  doc.setFont("courier", "bold");
  doc.text(`Ticket ${data.ticketLabel}`, marginX, y);
  y += 4;
  doc.setFont("courier", "normal");
  doc.text(data.date, marginX, y);
  y += 3.5;
  doc.text(`Cajero: ${data.cashier}`, marginX, y);
  y += 3.5;
  doc.text(`Cliente: ${data.customer}`, marginX, y);
  y += 4;

  doc.text("-".repeat(widthMm === 58 ? 32 : 42), centerX, y, { align: "center" });
  y += 4;

  for (const item of data.items) {
    doc.text(item.name.slice(0, widthMm === 58 ? 24 : 32), marginX, y);
    y += 3.5;
    doc.text(`  ${item.quantity} x S/ ${item.unitPrice.toFixed(2)}`, marginX, y);
    doc.text(`S/ ${item.subtotal.toFixed(2)}`, widthMm - marginX, y, { align: "right" });
    y += 4;
  }

  doc.text("-".repeat(widthMm === 58 ? 32 : 42), centerX, y, { align: "center" });
  y += 4;

  const row = (label: string, value: string, bold = false) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.text(label, marginX, y);
    doc.text(value, widthMm - marginX, y, { align: "right" });
    y += 4;
  };

  row("Subtotal:", `S/ ${data.subtotal.toFixed(2)}`);
  if (data.discount > 0) row("Descuento:", `S/ ${data.discount.toFixed(2)}`);
  row("TOTAL:", `S/ ${data.total.toFixed(2)}`, true);
  y += 1;
  row("Pago:", data.paymentLabel);
  if (data.amountReceived != null) row("Recibido:", `S/ ${data.amountReceived.toFixed(2)}`);
  if (data.changeAmount != null) row("Vuelto:", `S/ ${data.changeAmount.toFixed(2)}`);

  y += 3;
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.text("¡Gracias por su compra!", centerX, y, { align: "center" });

  doc.save(`ticket_${data.ticketLabel}.pdf`);
}
