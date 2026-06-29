const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB entrada
const MAX_OUTPUT_BYTES = 600 * 1024; // ~600 KB en demo (localStorage)

export interface ProcessedFile {
  dataUrl: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export function validateFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Solo se permiten imágenes (JPG, PNG, WebP).";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "La imagen es muy grande. Máximo 5 MB.";
  }
  return null;
}

export async function compressImage(file: File): Promise<ProcessedFile> {
  const error = validateFile(file);
  if (error) throw new Error(error);

  const bitmap = await createImageBitmap(file);
  const maxWidth = 1200;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  while (dataUrl.length > MAX_OUTPUT_BYTES * 1.37 && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > MAX_OUTPUT_BYTES * 1.37) {
    throw new Error(
      "La imagen sigue siendo muy grande. Prueba con otra foto más simple."
    );
  }

  const sizeBytes = Math.round((dataUrl.length * 3) / 4);

  return {
    dataUrl,
    name: file.name.replace(/\.[^.]+$/, ".jpg"),
    mimeType: "image/jpeg",
    sizeBytes,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
