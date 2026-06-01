import { useState, useCallback, useRef, type ChangeEvent } from 'react';
import './App.css'
import { useTranslation } from 'react-i18next';

type Tab = 'text' | 'image' | 'file';

function App() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('text');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [imgSrc, setImgSrc] = useState('');
  const [fileInfo, setFileInfo] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const encodeText = useCallback(() => {
    setError('');
    try { setOutput(btoa(unescape(encodeURIComponent(input)))); }
    catch (e: unknown) { setError('编码失败'); setOutput(''); }
  }, [input]);

  const decodeText = useCallback(() => {
    setError('');
    try { setInput(decodeURIComponent(escape(atob(input)))); }
    catch (e: unknown) { setError('解码失败：无效的 Base64 字符串'); }
  }, [input]);

  const handleImageFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { setOutput(reader.result as string); setError(''); };
    reader.onerror = () => setError('读取图片失败');
    reader.readAsDataURL(f);
    e.target.value = '';
  }, []);

  const showImage = useCallback(() => {
    const base64 = input.startsWith('data:') ? input : `data:image/png;base64,${input}`;
    setImgSrc(base64);
  }, [input]);

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setFileInfo(`文件: ${f.name} (${(f.size/1024).toFixed(1)} KB, ${f.type || '未知类型'})`);
    const reader = new FileReader();
    reader.onload = () => { setOutput(reader.result as string); setError(''); };
    reader.onerror = () => setError('读取文件失败');
    reader.readAsDataURL(f);
    e.target.value = '';
  }, []);

  const downloadFile = useCallback(() => {
    try {
      const a = document.createElement('a');
      a.href = output;
      a.download = fileName || 'decoded_file';
      a.click();
    } catch { setError('下载失败'); }
  }, [output, fileName]);

  return (
    <div className="app">
      <header className="header"><h1>Base64 Tool</h1><span className="subtitle">文本 / 图片 / 文件编解码</span></header>

      <div className="tab-bar">
        {(['text','image','file'] as Tab[]).map(t => (
          <button key={t} className={tab===t?'active':''} onClick={()=>{setTab(t);setInput('');setOutput('');setError('');setImgSrc('');setFileInfo('');setFileName('');}}>
            {{text:'文本编解码',image:'图片↔Base64',file:'文件↔Base64'}[t]}
          </button>
        ))}
      </div>

      {tab === 'text' && (
        <div className="text-section">
          <div className="panels">
            <div className="panel">
              <label>文本</label>
              <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="输入文本..." spellCheck={false} />
            </div>
            <div className="panel">
              <label>Base64</label>
              {error ? <div className="error">{error}</div> : <textarea value={output} readOnly spellCheck={false} />}
            </div>
          </div>
          <div className="action-row">
            <button className="action-btn" onClick={encodeText}>编码 →</button>
            <button className="action-btn" onClick={decodeText}>← 解码</button>
            <button className="action-btn copy" onClick={() => { navigator.clipboard.writeText(output); }}>复制结果</button>
          </div>
        </div>
      )}

      {tab === 'image' && (
        <div className="image-section">
          <div className="image-actions">
            <div className="upload-area">
              <label className="upload-label">上传图片编码</label>
              <input type="file" accept="image/*" onChange={handleImageFile} />
              {output && <span className="hint">已编码 (长度: {output.length})</span>}
            </div>
            <div className="decode-area">
              <label>粘贴 Base64 预览</label>
              <textarea rows={4} value={input} onChange={e => setInput(e.target.value)} placeholder="粘贴 Base64（可含 data:image/png;base64, 前缀）..." spellCheck={false} />
              <button onClick={showImage}>预览图片</button>
            </div>
          </div>
          {imgSrc && <div className="image-preview"><img src={imgSrc} alt="preview" /></div>}
          {output && <div className="output-text"><label>Base64 结果</label><textarea rows={6} value={output} readOnly /></div>}
          {error && <div className="error">{error}</div>}
        </div>
      )}

      {tab === 'file' && (
        <div className="file-section">
          <div className="file-actions">
            <label className="upload-label">选择文件</label>
            <input type="file" onChange={handleFileUpload} ref={fileRef} />
            {fileInfo && <span className="hint">{fileInfo}</span>}
          </div>
          {output && (
            <>
              <div className="output-text"><label>Base64 编码</label><textarea rows={6} value={output.slice(0, 5000)} readOnly /><span className="hint">总长度: {output.length} 字符</span></div>
              <button className="action-btn" onClick={downloadFile}>下载还原文件</button>
            </>
          )}
          {error && <div className="error">{error}</div>}
        </div>
      )}
    </div>
  );
}

export default App;