import { formatDateTime } from "@/lib/date";

export async function downloadTablePdf(title: string, head: string[], rows: (string | number)[][], filename: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.text(formatDateTime(new Date()), 14, 21);

  autoTable(doc, {
    head: [head],
    body: rows,
    startY: 26,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [5, 150, 105] },
  });

  doc.save(filename);
}
