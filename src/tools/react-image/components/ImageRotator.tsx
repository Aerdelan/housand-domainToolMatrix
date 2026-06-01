import { useRef, useState, useEffect } from 'react';
import {
  rotateImageToCanvas,
  canvasToBlob,
  downloadBlob,
  generateOutputFilename,
  getFileExtension,
} from '../utils/imageUtils';

interface Props {
  image: HTMLImageElement;
  file: File | null;
}

const PRESETS = [90, 180, 270];

const ImageRotator = ({ image, file }: Props) => {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(0);
  const [resultCanvas, setResultCanvas] = useState<HTMLCanvasElement | null>(null);

  // 初始预览
  useEffect(() => {
    drawPreview(image, 0);
  }, [image]);

  const drawPreview = (img: HTMLImageElement, rotationAngle: number) => {
    const canvas = previewRef.current;
    if (!canvas) return;

    const result = rotateImageToCanvas(img, rotationAngle);
    setResultCanvas(result);

    const maxPreview = 400;
    const scale = Math.min(1, maxPreview / Math.max(result.width, result.height));
    canvas.width = Math.round(result.width * scale);
    canvas.height = Math.round(result.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(result, 0, 0, canvas.width, canvas.height);
  };

  const handleRotate = (degrees: number) => {
    const newAngle = ((angle + degrees) % 360 + 360) % 360;
    setAngle(newAngle);
    drawPreview(image, newAngle);
  };

  const handlePreset = (degrees: number) => {
    setAngle(degrees);
    drawPreview(image, degrees);
  };

  const handleCustomAngle = (value: number) => {
    const clamped = ((value % 360) + 360) % 360;
    setAngle(clamped);
    drawPreview(image, clamped);
  };

  const handleDownload = async () => {
    if (!resultCanvas || !file) return;
    const ext = getFileExtension(file.name);
    const blob = await canvasToBlob(resultCanvas, ext || 'png', 0.95);
    const filename = generateOutputFilename(file.name, `rotated_${angle}`, ext || 'png');
    downloadBlob(blob, filename);
  };

  const handleReset = () => {
    setAngle(0);
    drawPreview(image, 0);
  };

  return (
    <div>
      <div className="section-title">图片旋转</div>

      {/* 预设按钮 */}
      <div className="controls-row">
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginRight: 8 }}>
          预设角度：
        </span>
        {PRESETS.map((deg) => (
          <button
            key={deg}
            className={`btn ${angle === deg ? 'active' : ''}`}
            onClick={() => handlePreset(deg)}
          >
            {deg}°
          </button>
        ))}
        <span style={{ margin: '0 8px', color: 'var(--border)' }}>|</span>

        {/* 快捷旋转 */}
        <button className="btn" onClick={() => handleRotate(90)}>
          顺时针 90°
        </button>
        <button className="btn" onClick={() => handleRotate(-90)}>
          逆时针 90°
        </button>
      </div>

      {/* 自定义角度 */}
      <div className="controls-row">
        <label>自定义角度：</label>
        <input
          type="number"
          className="input-number"
          value={angle}
          onChange={(e) => handleCustomAngle(Number(e.target.value))}
          min={-360}
          max={360}
        />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>°</span>
        <input
          type="range"
          min={0}
          max={360}
          value={angle}
          onChange={(e) => handleCustomAngle(Number(e.target.value))}
          style={{ flex: 1, minWidth: 120, maxWidth: 260 }}
        />
        <button className="btn" onClick={handleReset}>
          归零
        </button>
      </div>

      {/* 预览 */}
      <div style={{ marginTop: 16 }}>
        <div className="canvas-label">
          当前角度：<strong>{angle}°</strong>
          {resultCanvas && (
            <span>
              {' '}
              | 尺寸：{resultCanvas.width} × {resultCanvas.height}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <canvas
            ref={previewRef}
            style={{
              maxWidth: '100%',
              border: '1px solid var(--border)',
              borderRadius: 4,
              display: 'inline-block',
            }}
          />
        </div>
      </div>

      {/* 下载 */}
      <div className="result-actions" style={{ marginTop: 16 }}>
        <button className="btn btn-success" onClick={handleDownload}>
          下载旋转结果
        </button>
      </div>
    </div>
  );
};

export default ImageRotator;