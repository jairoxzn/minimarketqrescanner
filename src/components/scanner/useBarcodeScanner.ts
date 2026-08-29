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
  const zxingControlsRef = useRef<{ stop: () => void }[]>([]);

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
    zxingControlsRef.current.forEach((controls) => controls.stop());
    zxingControlsRef.current = [];
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
        const [
          { BrowserMultiFormatOneDReader, BrowserQRCodeReader },
          { DecodeHintType, BarcodeFormat },
        ] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);

        // Two dedicated readers run concurrently against the same video
        // element instead of one combined BrowserMultiFormatReader. Why:
        // a single MultiFormatReader with both 1D and QR formats requested
        // reorders its internal readers based on TRY_HARDER — with it off,
        // 1D goes first (good for our dominant case) but loses TRY_HARDER's
        // per-attempt thoroughness (scans the *entire* frame height instead
        // of ~25 sample rows, plus a 90°-rotation retry — see OneDReader.js
        // doDecode/decode); with it on, 1D gets pushed *after* QR, so every
        // frame probes for a QR finder pattern first. A real photo of a
        // barcode — angled, motion-blurred, off-center, glare from plastic
        // wrap — is exactly the case that thoroughness matters for, so
        // neither setting alone was right. Splitting into two single-purpose
        // readers gets both: the 1D reader can use TRY_HARDER without any
        // QR reader in its internal list to be pushed behind (no other
        // reader exists in that instance, so there's nothing to reorder),
        // and QR still works as a second, independent reader — it simply
        // isn't first in line, which is the correct priority for a grocery
        // POS scanner.
        const oneDHints = new Map();
        oneDHints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        oneDHints.set(DecodeHintType.TRY_HARDER, true);

        // The library's own default delay between decode attempts is 500ms
        // (@zxing/browser's BrowserCodeReader default) — a hard floor of 2
        // attempts/second regardless of camera frame rate. Dropped to 80ms
        // (~12/sec) on both readers for a snappier feel without pegging the
        // CPU. delayBetweenScanSuccess also set to 80ms rather than the
        // detection debounce (that dedup already lives in emit() above) —
        // the library option gates the *next attempt after any success*,
        // and a longer value here would block detecting a second, different
        // code shortly after the first, unlike the native BarcodeDetector
        // path (rAF loop, no such gate).
        const scanOptions = { delayBetweenScanAttempts: 80, delayBetweenScanSuccess: 80 };

        const oneDReader = new BrowserMultiFormatOneDReader(oneDHints, scanOptions);
        const qrReader = new BrowserQRCodeReader(undefined, scanOptions);

        const [oneDControls, qrControls] = await Promise.all([
          oneDReader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result) emit(result.getText());
          }),
          qrReader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result) emit(result.getText());
          }),
        ]);
        zxingControlsRef.current = [oneDControls, qrControls];
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
