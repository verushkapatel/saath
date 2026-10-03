function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function grayOf(data: Uint8ClampedArray, index: number): number {
  return data[index] * 0.3 + data[index + 1] * 0.59 + data[index + 2] * 0.11;
}

function deskew(context: CanvasRenderingContext2D, width: number, height: number): void {
  const sample = context.getImageData(0, 0, width, height);
  const small = 120;
  const scale = small / Math.max(width, height);
  const sw = Math.max(8, Math.round(width * scale));
  const sh = Math.max(8, Math.round(height * scale));
  const mini = document.createElement("canvas");
  mini.width = sw;
  mini.height = sh;
  const miniCtx = mini.getContext("2d");
  if (!miniCtx) return;
  miniCtx.drawImage(context.canvas, 0, 0, sw, sh);
  const pixels = miniCtx.getImageData(0, 0, sw, sh).data;
  let bestAngle = 0;
  let bestScore = -1;
  for (let deg = -8; deg <= 8; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    const proj = new Float32Array(sh);
    for (let y = 0; y < sh; y += 1) {
      for (let x = 0; x < sw; x += 1) {
        const g = grayOf(pixels, (y * sw + x) * 4);
        if (g > 180) continue;
        const ny = Math.round(y * Math.cos(rad) + x * Math.sin(rad));
        if (ny >= 0 && ny < sh) proj[ny] += 1;
      }
    }
    let mean = 0;
    for (const n of proj) mean += n;
    mean /= proj.length;
    let varn = 0;
    for (const n of proj) varn += (n - mean) ** 2;
    if (varn > bestScore) {
      bestScore = varn;
      bestAngle = deg;
    }
  }
  if (Math.abs(bestAngle) < 1) return;
  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.translate(width / 2, height / 2);
  context.rotate((-bestAngle * Math.PI) / 180);
  const tmp = document.createElement("canvas");
  tmp.width = width;
  tmp.height = height;
  tmp.getContext("2d")?.putImageData(sample, 0, 0);
  context.drawImage(tmp, -width / 2, -height / 2);
  context.restore();
}

/**
 * Wipes out long horizontal rules: the underlines and boxes printed on forms. Tesseract reads the letters that
 * touch a rule as noise, which garbles field names, worst of all in Devanagari. A run of dark pixels longer than
 * about a fifth of the page is a rule, never a letter or a word.
 */
function removeRules(context: CanvasRenderingContext2D, width: number, height: number): void {
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const minRun = Math.round(width * 0.22);
  for (let y = 0; y < height; y += 1) {
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      const dark = x < width && grayOf(data, (y * width + x) * 4) < 120;
      if (dark && start < 0) start = x;
      if (!dark && start >= 0) {
        if (x - start >= minRun) {
          for (let i = start; i < x; i += 1) {
            const at = (y * width + i) * 4;
            data[at] = data[at + 1] = data[at + 2] = 255;
          }
        }
        start = -1;
      }
    }
  }
  context.putImageData(image, 0, 0);
}

export async function preprocessImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const g = grayOf(data, i);
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const span = Math.max(1, max - min);
  // Stretch the contrast only. Pushing greys harder thins the vowel signs and the top line of Devanagari letters.
  for (let i = 0; i < data.length; i += 4) {
    const g = grayOf(data, i);
    data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, ((g - min) / span) * 255));
  }
  context.putImageData(image, 0, 0);
  try {
    deskew(context, width, height);
  } catch {
    // Deskew is best-effort on a slow phone.
  }
  try {
    removeRules(context, width, height);
  } catch {
    // Also best-effort.
  }
  // A lossless picture keeps thin strokes sharp. It only lives in memory while it is read.
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (png && png.size < 4 * 1024 * 1024) return png;
  return (await canvasBlob(canvas, 0.92)) ?? file;
}

export function photoQuality(file: Blob): Promise<{ dark: boolean; blurry: boolean }> {
  return new Promise((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const width = 80;
      const height = Math.max(1, Math.round((image.height / image.width) * width));
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        resolve({ dark: false, blurry: false });
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      const data = context.getImageData(0, 0, width, height).data;
      const gray = new Float32Array(width * height);
      let sum = 0;
      for (let i = 0; i < gray.length; i += 1) {
        gray[i] = grayOf(data, i * 4);
        sum += gray[i];
      }
      let lap = 0;
      let count = 0;
      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const index = y * width + x;
          const value = gray[index - width] + gray[index + width] + gray[index - 1] + gray[index + 1] - 4 * gray[index];
          lap += value * value;
          count += 1;
        }
      }
      URL.revokeObjectURL(url);
      resolve({ dark: sum / gray.length < 45, blurry: lap / count < 70 });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ dark: false, blurry: false });
    };
    image.src = url;
  });
}
