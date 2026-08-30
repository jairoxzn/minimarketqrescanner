"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRoiCanvas, drawRoiFrame, scanCroppedVideo } from "./roiScan";

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
  // La ruta nativa (BarcodeDetector) hace await detect() dentro de tick() —
  // cancelAnimationFrame por sí solo no interrumpe un tick ya en curso, así
  // que sin esta bandera un cierre justo durante un detect() en vuelo podía
  // emitir una detección y reprogramar otro rAF después de stop().
  const activeRef = useRef(false);

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
    activeRef.current = false;
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
        video: {
          facingMode: "environment",
          // La resolución por defecto que el navegador elige sin pedir nada
          // suele ser baja (a veces 640x480) — de sobra para videollamada,
          // pero le da al decodificador muy pocos píxeles por barra en un
          // código real, borroso o inclinado. Medido con un canvas sintético:
          // decodeFromCanvas tarda ~12ms a 640x480 pero ~63ms a 1920x1440 en
          // esta máquina (probablemente más en un celular real) — con el
          // intervalo de 80ms entre intentos, subir demasiado la resolución
          // le resta FPS reales al escaneo, justo lo contrario de lo que se
          // pidió acá. 1280 es un punto medio: ~3x más detalle que 640 sin
          // que el costo por intento se vuelva el cuello de botella.
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setState("scanning");

      const [track] = stream.getVideoTracks();
      const capabilities = track.getCapabilities?.() as
        | (MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] })
        | undefined;
      if (capabilities?.torch) setHasTorch(true);

      // Enfoque continuo si el dispositivo lo soporta — no es parte del tipo
      // estándar de TS (es una extensión de la Image Capture API, disponible
      // en Chrome/Android), de ahí el cast. Sin esto algunos teléfonos dejan
      // el enfoque fijo en lo último que enfocaron antes de abrir la cámara
      // (ej. algo lejano), y una foto de un código de cerca sale borrosa
      // aunque el usuario no mueva la mano — seguirá enfocando mientras
      // escanea en vez de solo una vez al abrir. Envuelto en try/catch
      // porque applyConstraints puede rechazar en dispositivos que anuncian
      // el modo en getCapabilities() pero no lo aceptan en la práctica.
      if (capabilities?.focusMode?.includes("continuous")) {
        try {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] });
        } catch {
          // sin soporte real pese a anunciarlo — seguir con el enfoque que ya tenga
        }
      }

      activeRef.current = true;

      if (window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({ formats: SUPPORTED_FORMATS });
        // Recortamos al mismo recuadro que ve el usuario antes de detectar,
        // en vez de pasarle el frame completo a detect() — ver roiScan.ts.
        // BarcodeDetector acepta un canvas igual que un <video>, así que
        // basta con dibujar el recorte en uno propio en cada tick. El canvas
        // se crea y dimensiona una sola vez (createRoiCanvas), no en cada
        // tick — ver el comentario de esa función.
        const roiCanvas = createRoiCanvas(videoRef.current);
        const roiCtx = roiCanvas.getContext("2d", { willReadFrequently: true }) ?? roiCanvas.getContext("2d");
        const tick = async () => {
          if (!activeRef.current || !videoRef.current || !roiCtx) return;
          try {
            if (drawRoiFrame(videoRef.current, roiCanvas, roiCtx)) {
              const results = await detector.detect(roiCanvas);
              // stop() puede haber corrido mientras detect() estaba en
              // vuelo — sin este chequeo, una detección tardía se emitía y
              // se reprogramaba otro rAF después de que el escáner ya se
              // había cerrado.
              if (!activeRef.current) return;
              if (results[0]) emit(results[0].rawValue);
            }
          } catch {
            // ignore transient detection errors, keep scanning
          }
          if (activeRef.current) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Fallback for browsers without native BarcodeDetector (e.g. desktop
        // Chrome on Windows — confirmed via testing that it isn't actually
        // available there — and Safari/iOS).
        const [
          { BrowserMultiFormatOneDReader, BrowserQRCodeReader },
          { DecodeHintType, BarcodeFormat, NotFoundException, ChecksumException, FormatException },
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

        const oneDReader = new BrowserMultiFormatOneDReader(oneDHints);
        const qrReader = new BrowserQRCodeReader();
        const exceptions = { NotFoundException, ChecksumException, FormatException };

        // Bucle propio (roiScan.ts) en vez de decodeFromVideoElement(), por
        // dos motivos: (1) recorta cada frame al recuadro del visor — ver el
        // comentario en roiScan.ts — y (2) al no depender de la espera
        // interna por el evento "canplay" del video (ya está reproduciéndose
        // en este punto), arranca de forma síncrona, así que a diferencia
        // del intento anterior con Promise.allSettled ya no existe ninguna
        // promesa que pueda rechazar a medio camino y dejar sin controles
        // capturados al lector que sí arrancó.
        //
        // El intervalo de 80ms (en vez del default de la librería, 500ms —
        // un piso de 2 intentos/seg sin importar el frame rate de la cámara)
        // sigue aplicando vía el 5to parámetro de scanCroppedVideo.
        const oneDControls = scanCroppedVideo(oneDReader, videoRef.current, emit, exceptions, 80);
        const qrControls = scanCroppedVideo(qrReader, videoRef.current, emit, exceptions, 80);
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
