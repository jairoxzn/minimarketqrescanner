"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBarcodeScanner } from "./useBarcodeScanner";

export function ScannerModal({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}) {
  const [manualCode, setManualCode] = useState("");
  const handleDetected = (code: string) => {
    onDetected(code);
  };
  const { state, videoRef, start, stop, hasTorch, torchOn, toggleTorch } = useBarcodeScanner(handleDetected);

  useEffect(() => {
    if (open) {
      start();
    } else {
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onDetected(manualCode.trim());
    setManualCode("");
  };

  return (
    <Modal open={open} onClose={onClose} title="Escanear código de barras" size="sm">
      <div className="flex flex-col gap-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          {state === "scanning" && (
            <div className="absolute inset-8 border-2 border-white/70 rounded-lg pointer-events-none" />
          )}
          {state === "requesting-permission" && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              Solicitando acceso a la cámara…
            </div>
          )}
          {hasTorch && state === "scanning" && (
            <button
              type="button"
              onClick={toggleTorch}
              className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center text-lg"
            >
              {torchOn ? "🔦" : "💡"}
            </button>
          )}
        </div>

        {state === "denied" && (
          <p className="text-sm text-danger">
            Se denegó el acceso a la cámara. Habilítalo en la configuración del navegador, o ingresa el código manualmente.
          </p>
        )}
        {state === "unsupported" && (
          <p className="text-sm text-warning">Este dispositivo no soporta escaneo por cámara. Ingresa el código manualmente.</p>
        )}
        {state === "insecure-context" && (
          <p className="text-sm text-warning">
            El navegador bloquea la cámara porque esta página no se abrió con conexión segura. Si estás probando desde
            el celular usando la IP de la computadora (ej. http://192.168.x.x:3000), eso no funciona para la cámara —
            usa <strong>https://</strong> o abre la app en <strong>localhost</strong>. Mientras tanto, ingresa el código manualmente.
          </p>
        )}
        {state === "error" && (
          <p className="text-sm text-danger">Ocurrió un error al iniciar la cámara. Intenta de nuevo o ingresa el código manualmente.</p>
        )}

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input
            placeholder="Ingresar código manualmente"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
      </div>
    </Modal>
  );
}
