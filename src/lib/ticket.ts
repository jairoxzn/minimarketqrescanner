export function formatTicketLabel(series: string, number: number) {
  return `${series}-${String(number).padStart(6, "0")}`;
}
