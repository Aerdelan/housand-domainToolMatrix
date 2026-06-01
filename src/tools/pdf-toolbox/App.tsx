import { useState, useRef, useCallback, type ChangeEvent } from 'react';
import { PDFDocument } from 'pdf-lib';
import './App.css'
import { useTranslation } from 'react-i18next';

type Tab = 'merge' | 'split' | 'extract' | 'watermark' | 'compress';

interface PDFFile {
  file: File;
  name: string;
  pages: number;
}

function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('merge');
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [splitRange, setSplitRange] = useState('');
  const [extractPages, setExtractPages] = useState('');
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [compressQuality, setCompressQuality] = useState(0.5);
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'merge', label: '合并 PDF' },
    { key: 'split', label: '拆分 PDF' },
    { key: 'extract', label: '提取页面' },
    { key: 'watermark', label: '图片水印' },
    { key: 'compress', label: '压缩 PDF' },
  ];

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const pdfFiles = selectedFiles.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      setStatus('请选择 PDF 文件');
      return;
    }

    const loaded: PDFFile[] = [];
    for (const file of pdfFiles) {
      try {
        const buf = await file.arrayBuffer();
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        loaded.push({ file, name: file.name, pages: doc.getPageCount() });
      } catch {
        loaded.push({ file, name: file.name, pages: 0 });
      }
    }
    setFiles(prev => [...prev, ...loaded]);
    setStatus(`已加载 ${loaded.length} 个文件`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const savePdf = (pdfBytes: Uint8Array, filename: string) => {
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Merge PDFs
  const handleMerge = async () => {
    if (files.length < 2) {
      setStatus('至少需要 2 个 PDF 文件才能合并');
      return;
    }
    setProcessing(true);
    setStatus('正在合并...');
    try {
      const mergedDoc = await PDFDocument.create();
      for (const { file } of files) {
        const buf = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        pages.forEach(p => mergedDoc.addPage(p));
      }
      const pdfBytes = await mergedDoc.save();
      savePdf(pdfBytes, 'merged.pdf');
      setStatus('合并完成！');
    } catch (e: unknown) {
      setStatus('合并失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
    setProcessing(false);
  };

  // Split PDF
  const handleSplit = async () => {
    if (files.length === 0) {
      setStatus('请先添加 PDF 文件');
      return;
    }
    const ranges = splitRange.split(',').map(s => s.trim()).filter(Boolean);
    if (ranges.length === 0) {
      setStatus('请输入页码范围，如: 1-3, 5-7');
      return;
    }
    setProcessing(true);
    setStatus('正在拆分...');
    try {
      const { file } = files[0];
      const buf = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();

      for (const range of ranges) {
        const newDoc = await PDFDocument.create();
        let start: number, end: number;
        if (range.includes('-')) {
          [start, end] = range.split('-').map(Number);
          if (isNaN(start) || isNaN(end)) continue;
        } else {
          start = end = Number(range);
          if (isNaN(start)) continue;
        }
        start = Math.max(1, start) - 1;
        end = Math.min(totalPages, end) - 1;

        const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const pages = await newDoc.copyPages(srcDoc, indices);
        pages.forEach(p => newDoc.addPage(p));

        const pdfBytes = await newDoc.save();
        const label = ranges.length > 1 ? `split_${start + 1}-${end + 1}` : 'split';
        savePdf(pdfBytes, `${label}.pdf`);
      }
      setStatus('拆分完成！');
    } catch (e: unknown) {
      setStatus('拆分失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
    setProcessing(false);
  };

  // Extract pages
  const handleExtract = async () => {
    if (files.length === 0) {
      setStatus('请先添加 PDF 文件');
      return;
    }
    const pages = extractPages.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (pages.length === 0) {
      setStatus('请输入要提取的页码，如: 1, 3, 5');
      return;
    }
    setProcessing(true);
    setStatus('正在提取...');
    try {
      const { file } = files[0];
      const buf = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();
      const totalPages = srcDoc.getPageCount();

      const indices = pages.map(p => Math.max(1, Math.min(totalPages, p)) - 1);
      const copied = await newDoc.copyPages(srcDoc, indices);
      copied.forEach(p => newDoc.addPage(p));

      const pdfBytes = await newDoc.save();
      savePdf(pdfBytes, 'extracted.pdf');
      setStatus('提取完成！');
    } catch (e: unknown) {
      setStatus('提取失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
    setProcessing(false);
  };

  // Add watermark
  const handleWatermark = async () => {
    if (files.length === 0) {
      setStatus('请先添加 PDF 文件');
      return;
    }
    if (!watermarkFile) {
      setStatus('请选择水印图片');
      return;
    }
    setProcessing(true);
    setStatus('正在添加水印...');
    try {
      const { file } = files[0];
      const pdfBuf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
      const imgBuf = await watermarkFile.arrayBuffer();

      let image;
      if (watermarkFile.type === 'image/png') {
        image = await pdfDoc.embedPng(imgBuf);
      } else if (watermarkFile.type === 'image/jpeg' || watermarkFile.type === 'image/jpg') {
        image = await pdfDoc.embedJpg(imgBuf);
      } else {
        setStatus('水印图片仅支持 PNG / JPEG 格式');
        setProcessing(false);
        return;
      }

      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        const imgDims = image.scale(0.4);
        const x = (width - imgDims.width) / 2;
        const y = (height - imgDims.height) / 2;
        page.drawImage(image, {
          x,
          y,
          width: imgDims.width,
          height: imgDims.height,
          opacity: watermarkOpacity,
        });
      }

      const pdfBytes = await pdfDoc.save();
      savePdf(pdfBytes, 'watermarked.pdf');
      setStatus('水印添加完成！');
    } catch (e: unknown) {
      setStatus('添加水印失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
    setProcessing(false);
  };

  // Compress
  const handleCompress = async () => {
    if (files.length === 0) {
      setStatus('请先添加 PDF 文件');
      return;
    }
    setProcessing(true);
    setStatus('正在压缩...');
    try {
      const { file } = files[0];
      const buf = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      // pdf-lib saves with reasonable compression by default
      // We simulate quality by removing metadata and using save options
      srcDoc.setTitle('');
      srcDoc.setAuthor('');
      srcDoc.setSubject('');
      srcDoc.setCreator('');
      srcDoc.setProducer('');
      const pdfBytes = await srcDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });
      savePdf(pdfBytes, 'compressed.pdf');
      setStatus('压缩完成！');
    } catch (e: unknown) {
      setStatus('压缩失败: ' + (e instanceof Error ? e.message : '未知错误'));
    }
    setProcessing(false);
  };

  const handleAction = () => {
    switch (activeTab) {
      case 'merge': handleMerge(); break;
      case 'split': handleSplit(); break;
      case 'extract': handleExtract(); break;
      case 'watermark': handleWatermark(); break;
      case 'compress': handleCompress(); break;
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>{t('tools.pdf-toolbox.title')}</h1>
        <span className="subtitle">{t('tools.pdf-toolbox.desc')}</span>
      </header>

      <nav className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.key); setFiles([]); setStatus(''); }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {/* File upload area */}
        <div className="upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple={activeTab === 'merge'}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            {activeTab === 'merge' ? '添加 PDF 文件' : '选择 PDF 文件'}
          </button>

          {/* File list */}
          {files.length > 0 && (
            <div className="file-list">
              {files.map((f, i) => (
                <div key={i} className="file-item">
                  <span className="file-icon">&#128196;</span>
                  <span className="file-name">{f.name}</span>
                  <span className="file-pages">{f.pages} 页</span>
                  <button className="btn-remove" onClick={() => removeFile(i)}>&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Options by tab */}
        <div className="options-section">
          {activeTab === 'split' && (
            <div className="option-group">
              <label>页码范围（如 1-3, 5-7）:</label>
              <input
                type="text"
                value={splitRange}
                onChange={e => setSplitRange(e.target.value)}
                placeholder="1-3, 5-7"
              />
            </div>
          )}

          {activeTab === 'extract' && (
            <div className="option-group">
              <label>提取页码（如 1, 3, 5）:</label>
              <input
                type="text"
                value={extractPages}
                onChange={e => setExtractPages(e.target.value)}
                placeholder="1, 3, 5"
              />
            </div>
          )}

          {activeTab === 'watermark' && (
            <div className="option-group">
              <label>水印图片:</label>
              <input
                ref={watermarkInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={e => setWatermarkFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              <button className="btn btn-secondary" onClick={() => watermarkInputRef.current?.click()}>
                {watermarkFile ? watermarkFile.name : '选择图片'}
              </button>
              <label style={{ marginTop: 12 }}>透明度: {watermarkOpacity.toFixed(1)}</label>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={watermarkOpacity}
                onChange={e => setWatermarkOpacity(parseFloat(e.target.value))}
              />
            </div>
          )}

          {activeTab === 'compress' && (
            <div className="option-group">
              <label>压缩质量: {compressQuality.toFixed(1)}</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={compressQuality}
                onChange={e => setCompressQuality(parseFloat(e.target.value))}
              />
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          className="btn btn-primary"
          onClick={handleAction}
          disabled={processing || files.length === 0}
        >
          {processing ? '处理中...' : getActionLabel(activeTab)}
        </button>

        {status && <div className="status">{status}</div>}
      </main>
    </div>
  );
}

function getActionLabel(tab: Tab): string {
  switch (tab) {
    case 'merge': return '合并 PDF';
    case 'split': return '拆分 PDF';
    case 'extract': return '提取页面';
    case 'watermark': return '添加水印';
    case 'compress': return '压缩 PDF';
  }
}

export default App;