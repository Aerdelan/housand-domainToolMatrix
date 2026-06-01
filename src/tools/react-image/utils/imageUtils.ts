/**
 * 图片处理工具函数
 * 所有操作基于 Canvas API 纯前端实现
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 将图片绘制到 Canvas 上（按显示尺寸缩放）
 */
export function drawImageToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  displayWidth: number,
  displayHeight: number
): void {
  canvas.width = displayWidth;
  canvas.height = displayHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, displayWidth, displayHeight);
  ctx.drawImage(image, 0, 0, displayWidth, displayHeight);
}

/**
 * 获取图片在容器内的显示缩放比
 */
export function getDisplayScale(
  image: HTMLImageElement,
  maxWidth: number
): { scale: number; width: number; height: number } {
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  return {
    scale,
    width: Math.round(image.naturalWidth * scale),
    height: Math.round(image.naturalHeight * scale),
  };
}

/**
 * 裁剪图片
 * cropArea 使用图片原始坐标
 */
export function cropImageToCanvas(
  image: HTMLImageElement,
  cropArea: CropArea
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cropArea.width);
  canvas.height = Math.round(cropArea.height);
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas;
}

/**
 * 旋转图片
 */
export function rotateImageToCanvas(
  image: HTMLImageElement,
  angle: number
): HTMLCanvasElement {
  const radians = (angle * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const newWidth = Math.round(iw * cos + ih * sin);
  const newHeight = Math.round(iw * sin + ih * cos);

  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(radians);
  ctx.drawImage(image, -iw / 2, -ih / 2, iw, ih);

  return canvas;
}

/**
 * 格式转换
 */
export function convertFormatToCanvas(
  image: HTMLImageElement
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  return canvas;
}

/**
 * 压缩图片（质量 + 尺寸）
 */
export function compressImageToCanvas(
  image: HTMLImageElement,
  options: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  }
): HTMLCanvasElement {
  let { width, height } = image;
  const { maxWidth, maxHeight } = options;

  if (maxWidth && width > maxWidth) {
    height = Math.round((height / width) * maxWidth);
    width = maxWidth;
  }
  if (maxHeight && height > maxHeight) {
    width = Math.round((width / height) * maxHeight);
    height = maxHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, width, height);

  return canvas;
}

/**
 * Canvas 转 Blob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number
): Promise<Blob> {
  const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('导出失败'));
      },
      mimeType,
      quality
    );
  });
}

/**
 * 下载 Blob 为文件
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * 生成输出文件名
 */
export function generateOutputFilename(
  originalName: string,
  suffix: string,
  newExt: string
): string {
  const base = originalName.replace(/\.[^.]+$/, '');
  return `${base}_${suffix}.${newExt}`;
}