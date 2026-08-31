"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getNotifications, type NotificationItem } from "@/actions/notifications.actions";

// Refresca en segundo plano mientras el panel está cerrado — sin esto un
// aviso (ej. "caja abierta hace 12 horas") solo se actualizaría al navegar
// a otra página, y alguien puede quedarse varias horas en el POS sin
// recargar nada.
const POLL_MS = 60_000;

export function NotificationBell({ initialNotifications }: { initialNotifications: NotificationItem[] }) {
  const [items, setItems] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Evita setItems() después de desmontar — si el layout se desmonta (ej. la
  // sesión expira y algo dispara un redirect client-side) mientras una
  // llamada de sondeo o de toggle() sigue en vuelo, la respuesta que llega
  // tarde no debe actualizar un componente que ya no existe.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const next = await getNotifications();
        if (mountedRef.current) setItems(next);
      } catch {
        // silencioso — un fallo de red no debe interrumpir al usuario, se reintenta en el próximo ciclo
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const fresh = await getNotifications();
        if (mountedRef.current) setItems(fresh);
      } catch {
        // se queda con lo que ya tenía
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificaciones"
        className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-lg"
      >
        🔔
        {items.length > 0 && (
          <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-80 max-w-[90vw] rounded-xl border border-border bg-white shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Notificaciones</h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-muted text-center py-8 px-4">Sin novedades por ahora.</p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2.5 px-4 py-3 border-b border-border last:border-0 hover:bg-background"
                >
                  <span className="mt-0.5 text-base">{item.severity === "danger" ? "🔴" : "🟡"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted truncate">{item.description}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
