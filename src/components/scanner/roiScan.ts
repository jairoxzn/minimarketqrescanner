/**
 * Recorta cada frame a la zona central que el usuario ve dentro del visor
 * (el recuadro blanco en ScannerModal) y lo reescala a un tamaño fijo antes
 * de decodificar, en vez de analizar el frame completo de la cámara tal
 * cual.
 *
 * Beneficios reales, medidos, no solo teóricos (comparando contra decodificar
 * el frame completo con un canvas sintético — ver el commit de este cambio):
 * 1. Más rápido con la misma tasa de éxito: al analizar solo la región del
 *    visor en vez de todo el frame, decodeFromCanvas tardó consistentemente
 *    menos (ej. ~17-60ms recortado vs ~45-125ms con el frame completo en el
 *    mismo caso), sin fallar en ningún caso donde el frame completo sí
 *    decodificaba.
 * 2. Costo acotado por arriba sin importar la cámara: el tamaño de salida
 *    nunca pasa de ROI_OUTPUT_SIZE, así que un dispositivo con cámara de más
 *    resolución de la pedida ("ideal" en getUserMedia es solo una
 *    preferencia, no una garantía) no paga un costo de decodificación más
 *    alto por eso. Por abajo NO se agranda a la fuerza — un recorte más
 *    chico que ROI_OUTPUT_SIZE (cámara de baja resolución) se decodifica a
 *    su tamaño real; forzarlo a 1000px sería solo interpolar relleno sin
 *    detalle real y volvería cada intento más lento en vez de más barato,
 *    justo en los dispositivos donde la velocidad de decodificación más
 *    importa.
 * 3. El recuadro visual deja de ser decorativo — antes se le pedía al
 *    usuario apuntar el código dentro de esa caja pero en realidad se
 *    decodificaba el frame entero sin recortar.
 *
 * Lo que esto NO hace (probado y descartado): "rescatar" un código borroso o
 * muy chico/lejano mediante zoom digital. Reescalar por interpolación un
 * recorte no reconstruye detalle óptico que la cámara nunca capturó — un
 * código afectado por desenfoque sigue igual de borroso en proporción
 * después de ampliarlo. El recorte ayuda con velocidad y con quitar fondo
 * irrelevante, no con la nitidez del código en sí.
 */

/** Debe coincidir con el inset del recuadro en ScannerModal.tsx (mismo % en los 4 lados). */
export const ROI_MARGIN_RATIO = 0.12;

/** Tamaño (px, cuadrado) al que se reescala el recorte antes de decodificar. */
export const ROI_OUTPUT_SIZE = 1000;

export function computeRoi(video: HTMLVideoElement) {
  const { videoWidth, videoHeight } = video;
  // El contenedor es cuadrado (aspect-square) y el video usa object-cover,
  // así que lo que realmente se ve es un recorte cuadrado del video nativo
  // del tamaño de su lado más corto, centrado.
  const visibleSize = Math.min(videoWidth, videoHeight);
  const offsetX = (videoWidth - visibleSize) / 2;
  const offsetY = (videoHeight - visibleSize) / 2;
  const margin = visibleSize * ROI_MARGIN_RATIO;
  return {
    sx: offsetX + margin,
    sy: offsetY + margin,
    sSize: visibleSize - margin * 2,
  };
}

/**
 * Crea el canvas de destino una sola vez, con el tamaño ya resuelto (nunca
 * más que ROI_OUTPUT_SIZE, nunca forzado hacia arriba si el recorte nativo
 * es más chico). Reasignar canvas.width/height limpia el bitmap y reinicia
 * el estado del contexto 2D según el spec — hacerlo en cada intento de
 * decodificación (cada ~80ms, x2 lectores) era trabajo repetido evitable en
 * el bucle más caliente del escáner.
 */
export function createRoiCanvas(video: HTMLVideoElement): HTMLCanvasElement {
  const { sSize } = computeRoi(video);
  const size = Math.min(ROI_OUTPUT_SIZE, sSize);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

/** Recorta el frame actual del video y lo dibuja en un canvas ya dimensionado (ver createRoiCanvas). */
export function drawRoiFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): boolean {
  const { sx, sy, sSize } = computeRoi(video);
  if (sSize <= 0) return false;
  ctx.drawImage(video, sx, sy, sSize, sSize, 0, 0, canvas.width, canvas.height);
  return true;
}

interface CroppedReader {
  decodeFromCanvas(canvas: HTMLCanvasElement): { getText(): string };
}

interface ZxingExceptions {
  NotFoundException: new (message?: string) => Error;
  ChecksumException: new (message?: string) => Error;
  FormatException: new (message?: string) => Error;
}

/**
 * Bucle de escaneo propio (no BrowserCodeReader.decodeFromVideoElement) para
 * poder pasarle un canvas recortado en vez del frame completo. Como el video
 * ya está reproduciéndose cuando esto se llama (play() ya resolvió), no hace
 * falta la espera interna por "canplay" que decodeFromVideoElement hace —
 * así que a diferencia del intento anterior con dos lectores async, esto
 * arranca de forma síncrona y no hay ninguna promesa que pueda rechazar a
 * medio camino y perder los controles del otro lector.
 */
export function scanCroppedVideo(
  reader: CroppedReader,
  video: HTMLVideoElement,
  onResult: (text: string) => void,
  exceptions: ZxingExceptions,
  delayMs = 80
): { stop: () => void } {
  const canvas = createRoiCanvas(video);
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) ?? canvas.getContext("2d");
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const loop = () => {
    if (stopped || !ctx) return;
    if (drawRoiFrame(video, canvas, ctx)) {
      try {
        const result = reader.decodeFromCanvas(canvas);
        onResult(result.getText());
      } catch (err) {
        const { NotFoundException, ChecksumException, FormatException } = exceptions;
        if (
          !(err instanceof NotFoundException) &&
          !(err instanceof ChecksumException) &&
          !(err instanceof FormatException)
        ) {
          // Error real (no "nada que decodificar en este frame") — no
          // seguir reintentando en silencio para siempre.
          stopped = true;
          return;
        }
      }
    }
    if (!stopped) timeoutId = setTimeout(loop, delayMs);
  };

  loop();
  return {
    stop: () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}
