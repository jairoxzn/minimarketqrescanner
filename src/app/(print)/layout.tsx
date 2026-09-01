import { Geist_Mono } from "next/font/google";

// Cargada acá en vez del layout raíz: font-mono (TicketView.tsx) solo se usa
// en la ruta del ticket imprimible, así que el layout raíz precargando esta
// fuente en cada página de la app (login, POS, dashboard…) sin usarla nunca
// ahí generaba la advertencia de Chrome "preloaded but not used" en todas
// partes menos aquí, donde de verdad hace falta.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${geistMono.variable} min-h-screen bg-slate-100 flex flex-col items-center py-6`}>
      {children}
    </div>
  );
}
