import { useRef, useState, useEffect, useCallback, type MouseEvent } from 'react';
import {
  getDisplayScale,
  drawImageToCanvas,
  cropImageToCanvas,
  canvasToBlob,
  downloadBlob,
  generateOutputFilename,
  getFileExtension,
  CropArea,
} from '../utils/imageUtils';

interface Props {
  image: HTMLImageElement;
  file: File | null;
}

const MAX_WIDTH = 650;
const RATIOS: { label: string; value: number | null }[] = [
  { label: '自由', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
];

const ImageCropper = ({ image, file }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const [display, setDisplay] = useState({ scale: 1, width: 0, height: 0 });
  const [cropRect, setCropRect] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [resultCanvas, setResultCanvas] = useState<HTMLCanvasElement | null>(null);

  // 初始化显示尺寸
  useEffect(() => {
    const d = getDisplayScale(image, MAX_WIDTH);
    setDisplay(d);
    setCropRect(null);
    setResultCanvas(null);
  }, [image]);

  // 绘制画布（图片 + 裁剪遮罩）
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawImageToCanvas(canvas, image, display.width, display.height);
    if (!cropRect) return;

    const ctx = canvas.getContext('2d')!;
    const { x, y, width, height } = cropRect;

    // 暗色遮罩：上方、下方、左侧、右侧
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, display.width, y);                          // 上
    ctx.fillRect(0, y + height, display.width, display.height);     // 下
    ctx.fillRect(0, y, x, height);                                   // 左
    ctx.fillRect(x + width, y, display.width - x - width, height);   // 右

    // 裁剪区域虚线边框
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);

    // 四角标记
    const cornerLen = Math.min(20, width / 4, height / 4);
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    const corners = [
      [x, y, 1, 1], [x + width, y, -1, 1],
      [x, y + height, 1, -1], [x + width, y + height, -1, -1],
    ];
    corners.forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + cornerLen * dx, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + cornerLen * dy);
      ctx.stroke();
    });
  }, [image, display, cropRect]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // 获取鼠标在画布上的坐标（处理 CSS 缩放）
  const getCanvasPos = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * display.width,
        y: ((e.clientY - rect.top) / rect.height) * display.height,
      };
    },
    [display]
  );

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    // 确保在画布范围内
    if (pos.x < 0 || pos.x > display.width || pos.y < 0 || pos.y > display.height) return;
    setIsDragging(true);
    setDragStart(pos);
    setResultCanvas(null);
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const pos = getCanvasPos(e);

    // 限制在画布内
    const clampX = Math.max(0, Math.min(pos.x, display.width));
    const clampY = Math.max(0, Math.min(pos.y, display.height));

    let x = Math.min(dragStart.x, clampX);
    let y = Math.min(dragStart.y, clampY);
    let w = Math.abs(clampX - dragStart.x);
    let h = Math.abs(clampY - dragStart.y);

    // 比率约束
    if (aspectRatio && w > 3 && h > 3) {
      if (w / h > aspectRatio) {
        w = h * aspectRatio;
      } else {
        h = w / aspectRatio;
      }
      if (clampX < dragStart.x) x = dragStart.x - w;
      if (clampY < dragStart.y) y = dragStart.y - h;
      x = Math.max(0, x);
      y = Math.max(0, y);
      if (x + w > display.width) w = display.width - x;
      if (y + h > display.height) h = display.height - y;
    }

    setCropRect({ x, y, width: w, height: h });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (cropRect && cropRect.width < 5 && cropRect.height < 5) {
      setCropRect(null);
    }
  };

  // 应用裁剪
  const handleApplyCrop = () => {
    if (!cropRect || cropRect.width < 5) return;

    const natural: CropArea = {
      x: cropRect.x / display.scale,
      y: cropRect.y / display.scale,
      width: cropRect.width / display.scale,
      height: cropRect.height / display.scale,
    };

    const result = cropImageToCanvas(image, natural);
    setResultCanvas(result);

    // 预览
    if (previewRef.current && result) {
      const preview = previewRef.current;
      const maxPreview = 280;
      const pScale = Math.min(1, maxPreview / result.width);
      preview.width = result.width * pScale;
      preview.height = result.height * pScale;
      const pctx = preview.getContext('2d')!;
      pctx.drawImage(result, 0, 0, preview.width, preview.height);
    }
  };

  // 下载结果
  const handleDownload = async () => {
    if (!resultCanvas || !file) return;
    const ext = getFileExtension(file.name);
    const blob = await canvasToBlob(resultCanvas, ext || 'png', 0.95);
    const filename = generateOutputFilename(file.name, 'cropped', ext || 'png');
    downloadBlob(blob, filename);
  };

  return (
    <div>
      <div className="section-title">图片裁剪</div>

      {/* 比例选择 */}
      <div className="controls-row">
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginRight: 8 }}>
          裁剪比例：
        </span>
        <div className="ratio-pills">
          {RATIOS.map((r) => (
            <button
              key={r.label}
              className={`ratio-pill ${aspectRatio === r.value ? 'active' : ''}`}
              onClick={() => {
                setAspectRatio(r.value);
                setCropRect(null);
                setResultCanvas(null);
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 裁剪画布 */}
      <div className="canvas-container">
        <div className="canvas-panel">
          <div className="canvas-label">
            在图片上拖拽选择裁剪区域（{display.width} × {display.height}）
          </div>
          <canvas
            ref={canvasRef}
            style={{
              cursor: isDragging ? 'crosshair' : 'crosshair',
              width: '100%',
              height: 'auto',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {cropRect && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              选区：{Math.round(cropRect.width / display.scale)} ×{' '}
              {Math.round(cropRect.height / display.scale)} px
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="controls-row" style={{ marginTop: 16 }}>
        <button
          className="btn btn-primary"
          onClick={handleApplyCrop}
          disabled={!cropRect || cropRect.width < 5}
        >
          应用裁剪
        </button>
        <button
          className="btn"
          onClick={() => {
            setCropRect(null);
            setResultCanvas(null);
          }}
        >
          重置选区
        </button>
      </div>

      {/* 裁剪结果 */}
      {resultCanvas && (
        <div className="result-section">
          <div className="section-title">裁剪结果</div>
          <div className="result-preview">
            <canvas ref={previewRef} />
            <div className="result-meta">
              <div>
                尺寸：<strong>{resultCanvas.width} × {resultCanvas.height}</strong>
              </div>
              <div>
                原始尺寸：<strong>{image.naturalWidth} × {image.naturalHeight}</strong>
              </div>
            </div>
          </div>
          <div className="result-actions">
            <button className="btn btn-success" onClick={handleDownload}>
              下载裁剪结果
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCropper;