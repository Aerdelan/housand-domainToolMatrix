import { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ImageCropper from './components/ImageCropper';
import ImageRotator from './components/ImageRotator';
import ImageConverter from './components/ImageConverter';
import ImageCompressor from './components/ImageCompressor';
import './App.css'
import { useTranslation } from 'react-i18next';

type Tab = 'crop' | 'rotate' | 'convert' | 'compress';

const App: React.FC = () => {
  const { t } = useTranslation();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('crop');

  const handleImageLoad = (img: HTMLImageElement, f: File) => {
    setImage(img);
    setFile(f);
  };

  const handleReset = () => {
    setImage(null);
    setFile(null);
    setActiveTab('crop');
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'crop', label: '裁剪', icon: '▢' },
    { key: 'rotate', label: '旋转', icon: '↻' },
    { key: 'convert', label: '格式转换', icon: '⇄' },
    { key: 'compress', label: '压缩', icon: '↘' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('tools.react-image.title')}</h1>
        <p className="subtitle">{t('tools.react-image.desc')}</p>
      </header>

      {!image ? (
        <ImageUploader onImageLoad={handleImageLoad} />
      ) : (
        <>
          <div className="tab-bar">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            <button className="tab-btn reset-btn" onClick={handleReset}>
              重新上传
            </button>
          </div>

          <div className="file-info">
            当前文件：<strong>{file?.name}</strong>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            尺寸：<strong>{image.naturalWidth} × {image.naturalHeight}</strong>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            大小：<strong>{formatFileSize(file?.size || 0)}</strong>
          </div>

          <div className="tab-content">
            {activeTab === 'crop' && <ImageCropper image={image} file={file} />}
            {activeTab === 'rotate' && <ImageRotator image={image} file={file} />}
            {activeTab === 'convert' && <ImageConverter image={image} file={file} />}
            {activeTab === 'compress' && <ImageCompressor image={image} file={file} />}
          </div>
        </>
      )}
    </div>
  );
};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default App;