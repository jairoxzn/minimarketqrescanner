export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 flex flex-col items-center py-6">{children}</div>;
}
