import { ImagePixelAnalysis } from '../types/project';

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Deterministic pixel-sampling analyzer for camera & gallery images (no AI).
 */
export async function analyzeImagePixels(
  dataUrl: string
): Promise<ImagePixelAnalysis> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const sampleW = 48;
      const sampleH = 48;
      const canvas = document.createElement('canvas');
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, sampleW, sampleH);
      const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let maxSat = -1;
      let accentR = 56;
      let accentG = 189;
      let accentB = 248;
      const count = sampleW * sampleH;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        sumR += r;
        sumG += g;
        sumB += b;
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = maxC - minC;
        if (sat > maxSat && maxC > 50) {
          maxSat = sat;
          accentR = r;
          accentG = g;
          accentB = b;
        }
      }

      const avgR = sumR / count;
      const avgG = sumG / count;
      const avgB = sumB / count;
      const brightness = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

      resolve({
        dominantColor: rgbToHex(
          Math.max(40, accentR),
          Math.max(40, accentG),
          Math.max(40, accentB)
        ),
        accentColor: rgbToHex(
          Math.min(255, avgR * 1.15 + 30),
          Math.min(255, avgG * 1.15 + 30),
          Math.min(255, avgB * 1.15 + 30)
        ),
        backgroundColor: rgbToHex(avgR * 0.22, avgG * 0.22, avgB * 0.25),
        brightness: Math.round(brightness),
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };
    img.onerror = () => reject(new Error('تعذر قراءة الصورة المختارة.'));
    img.src = dataUrl;
  });
}
