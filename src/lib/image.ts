/**
 * Comprime y redimensiona una imagen en el navegador antes de guardarla como
 * data URL (base64) — sin esto, una foto de celular de varios MB volvería
 * pesadísimas las listas de productos y el POS, que muestran la imagen de
 * cada producto. No aplica a los QR de métodos de pago (esos se guardan tal
 * cual, PNG sin pérdida, para no arriesgar que dejen de poder escanearse).
 */
export function compressImageToDataUrl(
  file: File,
  { maxDimension = 640, quality = 0.75 }: { maxDimension?: number; quality?: number } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar la imagen"));
        return;
      }
      // Fondo blanco por si el original tiene transparencia (JPEG no la soporta).
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = objectUrl;
  });
}
