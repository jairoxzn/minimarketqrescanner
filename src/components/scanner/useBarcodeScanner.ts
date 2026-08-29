"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ScannerState =
  | "idle"
  | "requesting-permission"
  | "scanning"
  | "denied"
  | "unsupported"
  | "insecure-context"
  | "error";

const SUPPORTED_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"];
const DETECTION_DEBOUNCE_MS = 1500;

// Minimal shape of the native BarcodeDetector API (not in TS lib.dom yet).
interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => NativeBarcodeDetector;
  }
}

export function useBarcodeScanner(onDetected: (code: string) => void) {
  const [state, setState] = useState<ScannerState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<{ code: string; at: number } | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);

  const emit = useCallback(
    (code: string) => {
      const now = Date.now();
      const last = lastDetectionRef.current;
      if (last && last.code === code && now - last.at < DETECTION_DEBOUNCE_MS) return;
      lastDetectionRef.current = { code, at: now };
      onDetected(code);
    },
    [onDetected]
  );

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("idle");
    setHasTorch(false);
    setTorchOn(false);
  }, []);

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    setErrorMessage(null);

    // getUserMedia is only available in a "secure context" — https://, or the
    // literal hosts "localhost"/"127.0.0.1". Opening the app over plain
    // http:// from another device's browser (e.g. testing on a phone via the
    // desktop's LAN IP, like http://192.168.x.x:3000) fails this check even
    // though everything else about the setup is fine — the most common real-
    // world reason the camera silently never starts. Surfaced explicitly so
    // it doesn't just look like a generic "unsupported" or "error".
    if (!window.isSecureContext) {
      setState("insecure-context");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }

    setState("requesting-permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setState("scanning");

      const [track] = stream.getVideoTracks();
      const capabilities = track.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      if (capabilities?.torch) setHasTorch(true);

      if (window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({ formats: SUPPORTED_FORMATS });
        const tick = async () => {
          if (!videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results[0]) emit(results[0].rawValue);
          } catch {
            // ignore transient detection errors, keep scanning
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Fallback for browsers without native BarcodeDetector (e.g. desktop
        // Chrome on Windows — confirmed via testing that it isn't actually
        // available there — and Safari/iOS).
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);

        // Two changes that materially affect how fast this feels, not just
        // how it's configured:
        // 1. Restrict formats to what a retail barcode scanner actually
        //    needs. With no hints, MultiFormatReader tries EVERY format on
        //    every attempt (QR, DataMatrix, Aztec, PDF417, MaxiCode, etc.) —
        //    confirmed via a live-video test where all of those fired on
        //    every single frame. Pure wasted CPU per attempt.
        // 2. The library's own default delay between decode attempts is
        //    500ms (@zxing/browser's BrowserCodeReader default) — meaning at
        //    most 2 attempts/second regardless of camera frame rate, which
        //    is the dominant reason this felt slow, not the format list.
        //    Dropped to 80ms (~12 attempts/second) for a snappier feel
        //    without pegging the CPU.
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 80,
          delayBetweenScanSuccess: DETECTION_DEBOUNCE_MS,
        });
        const controls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result) emit(result.getText());
        });
        zxingControlsRef.current = controls;
      }
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setState("denied");
          return;
        }
        // Distinguish the common camera-acquisition failures — a vague
        // "hubo un error" for all of them hides exactly the info needed to
        // tell "no camera on this machine" apart from "another app has it".
        const messages: Record<string, string> = {
          NotFoundError: "No se encontró ninguna cámara en este dispositivo.",
          NotReadableError: "La cámara está siendo usada por otra aplicación o pestaña — ciérrala e intenta de nuevo.",
          OverconstrainedError: "La cámara de este dispositivo no cumple los requisitos solicitados (ej. cámara trasera).",
          SecurityError: "El navegador bloqueó el acceso a la cámara por seguridad.",
          AbortError: "El acceso a la cámara se interrumpió antes de completarse.",
        };
        setErrorMessage(messages[err.name] ?? `Error de cámara: ${err.name} — ${err.message}`);
      } else {
        setErrorMessage(err instanceof Error ? err.message : "Error desconocido al iniciar la cámara.");
      }
      setState("error");
    }
  }, [emit]);

  const toggleTorch = useCallback(async () => {
    const [track] = streamRef.current?.getVideoTracks() ?? [];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn((v) => !v);
    } catch {
      // torch not actually controllable on this device — ignore
    }
  }, [torchOn]);

  useEffect(() => stop, [stop]);

  return { state, errorMessage, videoRef, start, stop, hasTorch, torchOn, toggleTorch };
}
