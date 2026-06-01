import { useState } from 'react';
import {
  convertFormatToCanvas,
  canvasToBlob,
  downloadBlob,
  generateOutputFilename,
  getFileExtension,
} from '../utils/imageUtils';

interface Props {
  image: HTMLImageElement;
  file: File | null;
}

interface FormatOption {
  value: string;
  label: string;
  mime: string;
  supportsQuality: boolean;
}

const FORMATS: FormatOption[] = [
  { value: 'png', label: 'PNG', mime: 'image/png', supportsQuality: false },
  { value: 'jpeg', label: 'JPEG', mime: 'image/jpeg', supportsQuality: true },
  { value: 'webp', label: 'WebP', mime: 'image/webp', supportsQuality: true },
  { value: 'bmp', label: 'BMP', mime: 'image/bmp', supportsQuality: false },
];

const ImageConverter = ({ image, file }: Props) => {
  const originalExt = file ? getFileExtension(file.name) : '';
  const originalFormat = FORMATS.find((f) => f.value === originalExt)?.label || originalExt.toUpperCase();

  const [targetFormat, setTargetFormat] = useState<string>(
    originalExt === 'png' ? 'jpeg' : originalExt === 'jpeg' ? 'png' : 'png'
  );
  const [quality, setQuality] = useState(90);
  const [resultInfo, setResultInfo] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);

  const selectedFormat = FORMATS.find((f) => f.value === targetFormat)!;

  const handleConvert = async () => {
    if (!file) return;

    const canvas = convertFormatToCanvas(image);
    const exportQuality = selectedFormat.supportsQuality ? quality / 100 : 1;
    const blob = await canvasToBlob(canvas, targetFormat, exportQuality);
    const filename = generateOutputFilename(file.name, 'converted', targetFormat);

    setResultInfo({ blob, filename });
  };

  const handleDownload = () => {
    if (!resultInfo) return;
    downloadBlob(resultInfo.blob, resultInfo.filename);
  };

  return (
    <div>
      <div className="section-title">格式转换</div>

      {/* 源文件信息 */}
      <div className="controls-row" style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          原始格式：<strong>{originalFormat}</strong>
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          原始尺寸：<strong>{image.naturalWidth} × {image.naturalHeight}</strong>
        </span>
      </div>

      {/* 格式选择 */}
      <div className="controls-row">
        <label>目标格式：</label>
        <select
          className="select"
          value={targetFormat}
          onChange={(e) => {
            setTargetFormat(e.target.value);
            setResultInfo(null);
          }}
        >
          {FORMATS.filter((f) => f.value !== originalExt).map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}（.{f.value}）
            </option>
          ))}
        </select>
      </div>

      {/* 质量调节（JPEG/WebP） */}
      {selectedFormat.supportsQuality && (
        <div className="controls-row">
          <div className="slider-group">
            <label>
              <span>输出质量</span>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{quality}%</span>
            </label>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => {
                setQuality(Number(e.target.value));
                setResultInfo(null);
              }}
            />
          </div>
        </div>
      )}

      {/* 转换按钮 */}
      <div className="controls-row">
        <button className="btn btn-primary" onClick={handleConvert}>
          开始转换
        </button>
      </div>

      {/* 转换结果 */}
      {resultInfo && (
        <div className="result-section">
          <div className="section-title">转换结果</div>
          <div className="result-meta">
            <div>
              输出文件：<strong>{resultInfo.filename}</strong>
            </div>
            <div>
              输出大小：<strong>{formatFileSize(resultInfo.blob.size)}</strong>
            </div>
            <div>
              原始大小：<strong>{formatFileSize(file?.size || 0)}</strong>
            </div>
            {file && file.size > 0 && (
              <div>
                压缩率：<strong>
                  {((1 - resultInfo.blob.size / file.size) * 100).toFixed(1)}%
                </strong>
                {resultInfo.blob.size < file.size ? '（减小）' : '（增大）'}
              </div>
            )}
          </div>
          <div className="result-actions">
            <button className="btn btn-success" onClick={handleDownload}>
              下载转换结果
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

export default ImageConverter;