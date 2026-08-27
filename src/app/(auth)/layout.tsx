export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">VendeMóvil</h1>
          <p className="text-sm text-muted mt-1">Tu negocio, tus ventas, desde cualquier navegador.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
