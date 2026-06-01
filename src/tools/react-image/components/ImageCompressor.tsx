import { useRef, useState, useEffect } from 'react';
import {
  compressImageToCanvas,
  canvasToBlob,
  downloadBlob,
  generateOutputFilename,
  getFileExtension,
} from '../utils/imageUtils';

interface Props {
  image: HTMLImageElement;
  file: File | null;
}

const ImageCompressor = ({ image, file }: Props) => {
  const previewRef = useRef<HTMLCanvasElement>(null);

  const [quality, setQuality] = useState(80);
  const [scalePercent, setScalePercent] = useState(100);
  const [targetW, setTargetW] = useState(image.naturalWidth);
  const [targetH, setTargetH] = useState(image.naturalHeight);
  const [lockAspect, setLockAspect] = useState(true);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultCanvas, setResultCanvas] = useState<HTMLCanvasElement | null>(null);

  const ext = file ? getFileExtension(file.name) : 'png';
  const exportFormat = ext === 'jpg' ? 'jpeg' : ext || 'png';

  // 初始化尺寸
  useEffect(() => {
    setTargetW(image.naturalWidth);
    setTargetH(image.naturalHeight);
  }, [image]);

  // 缩放百分比改变时同步像素值
  useEffect(() => {
    if (lockAspect) {
      setTargetW(Math.round(image.naturalWidth * (scalePercent / 100)));
      setTargetH(Math.round(image.naturalHeight * (scalePercent / 100)));
    }
  }, [scalePercent, lockAspect, image]);

  // 宽度改变时联动高度
  const handleWidthChange = (w: number) => {
    setTargetW(w);
    if (lockAspect) {
      setTargetH(Math.round((w / image.naturalWidth) * image.naturalHeight));
      setScalePercent(Math.round((w / image.naturalWidth) * 100));
    }
  };

  // 高度改变时联动宽度
  const handleHeightChange = (h: number) => {
    setTargetH(h);
    if (lockAspect) {
      setTargetW(Math.round((h / image.naturalHeight) * image.naturalWidth));
      setScalePercent(Math.round((h / image.naturalHeight) * 100));
    }
  };

  // 执行压缩
  const handleCompress = async () => {
    const canvas = compressImageToCanvas(image, {
      maxWidth: targetW,
      maxHeight: targetH,
    });

    setResultCanvas(canvas);

    const blob = await canvasToBlob(canvas, exportFormat, quality / 100);
    setResultBlob(blob);

    // 预览
    if (previewRef.current) {
      const preview = previewRef.current;
      const maxPreview = 350;
      const pScale = Math.min(1, maxPreview / Math.max(canvas.width, canvas.height));
      preview.width = Math.round(canvas.width * pScale);
      preview.height = Math.round(canvas.height * pScale);
      const pctx = preview.getContext('2d')!;
      pctx.drawImage(canvas, 0, 0, preview.width, preview.height);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const filename = generateOutputFilename(file.name, 'compressed', exportFormat);
    downloadBlob(resultBlob, filename);
  };

  const originalSize = file?.size || 0;

  return (
    <div>
      <div className="section-title">图片压缩</div>

      {/* 质量调节 */}
      <div className="controls-row">
        <div className="slider-group">
          <label>
            <span>输出质量</span>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{quality}%</span>
          </label>
          <input
            type="range"
            min={5}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
          />
        </div>
      </div>

      {/* 尺寸缩放 */}
      <div className="controls-row">
        <div className="slider-group">
          <label>
            <span>尺寸缩放</span>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{scalePercent}%</span>
          </label>
          <input
            type="range"
            min={5}
            max={100}
            value={scalePercent}
            onChange={(e) => setScalePercent(Number(e.target.value))}
          />
        </div>
      </div>

      {/* 精确尺寸 */}
      <div className="controls-row">
        <label>宽度：</label>
        <input
          type="number"
          className="input-number"
          value={targetW}
          onChange={(e) => handleWidthChange(Number(e.target.value))}
          min={1}
          max={image.naturalWidth}
        />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>px</span>

        <button
          className={`btn ${lockAspect ? 'active' : ''}`}
          onClick={() => setLockAspect(!lockAspect)}
          style={{ marginLeft: 8, fontSize: 12 }}
          title="锁定宽高比"
        >
          {lockAspect ? '链接' : '解锁'}
        </button>

        <label style={{ marginLeft: 12 }}>高度：</label>
        <input
          type="number"
          className="input-number"
          value={targetH}
          onChange={(e) => handleHeightChange(Number(e.target.value))}
          min={1}
          max={image.naturalHeight}
        />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>px</span>

        <button
          className="btn"
          style={{ marginLeft: 8, fontSize: 12 }}
          onClick={() => {
            setScalePercent(100);
            setTargetW(image.naturalWidth);
            setTargetH(image.naturalHeight);
          }}
        >
          原始尺寸
        </button>
      </div>

      {/* 执行按钮 */}
      <div className="controls-row">
        <button className="btn btn-primary" onClick={handleCompress}>
          预览压缩效果
        </button>
      </div>

      {/* 结果 */}
      {resultBlob && resultCanvas && (
        <div className="result-section">
          <div className="section-title">压缩预览</div>
          <div className="result-preview">
            <canvas ref={previewRef} />
            <div className="result-meta">
              <div>
                原始大小：<strong>{formatFileSize(originalSize)}</strong>
              </div>
              <div>
                压缩后：<strong style={{ color: 'var(--primary)' }}>
                  {formatFileSize(resultBlob.size)}
                </strong>
              </div>
              <div>
                压缩率：<strong>
                  {originalSize > 0
                    ? ((1 - resultBlob.size / originalSize) * 100).toFixed(1)
                    : '—'}%
                </strong>
              </div>
              <div>
                输出尺寸：<strong>
                  {resultCanvas.width} × {resultCanvas.height}
                </strong>
              </div>
              <div>
                原始尺寸：<strong>
                  {image.naturalWidth} × {image.naturalHeight}
                </strong>
              </div>
            </div>
          </div>
          <div className="result-actions">
            <button className="btn btn-success" onClick={handleDownload}>
              下载压缩结果
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default ImageCompressor;