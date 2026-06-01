import { useRef, useState, useCallback, type ChangeEvent, type DragEvent } from 'react';

interface ImageUploaderProps {
  onImageLoad: (image: HTMLImageElement, file: File) => void;
  accept?: string;
}

const ImageUploader = ({
  onImageLoad,
  accept = 'image/*',
}: ImageUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => onImageLoad(img, file);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [onImageLoad]
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div
      className={`uploader ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        hidden
      />
      <div className="uploader-inner">
        <div className="uploader-icon">&#x1F5BC;</div>
        <p>拖放图片到此处，或点击上传</p>
        <p className="uploader-hint">支持 JPG、PNG、WebP、BMP、GIF、SVG 等格式</p>
      </div>
    </div>
  );
};

export default ImageUploader;