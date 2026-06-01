import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'
import { useTranslation } from 'react-i18next'

interface ImageItem { id: string; src: string; file: File }

interface GifWriterInstance {
  addFrame(x: number, y: number, w: number, h: number, indexed: Uint8Array, opts: { palette: number[]; delay: number }): void
  end(): number
}
interface OmggifModule { GifWriter: new (buf: Uint8Array, w: number, h: number, opts?: { loop?: number }) => GifWriterInstance }

function App() {
  const { t } = useTranslation();
  const [images, setImages] = useState<ImageItem[]>([])
  const [frameDelay, setFrameDelay] = useState(500)
  const [outputWidth, setOutputWidth] = useState(480)
  const [outputHeight, setOutputHeight] = useState(270)
  const [quality, setQuality] = useState(10)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const timerRef = useRef<number>(0)

  const handleFiles = useCallback((files: FileList | File[]) => {
    const items: ImageItem[] = []
    const readers: Promise<ImageItem>[] = []
    Array.from(files).forEach(f => {
      if (!f.type.startsWith('image/')) return
      const promise = new Promise<ImageItem>(resolve => {
        const img = new Image()
        img.onload = () => resolve({ id: Math.random().toString(36).slice(2), src: URL.createObjectURL(f), file: f })
        img.src = URL.createObjectURL(f)
      })
      readers.push(promise)
    })
    Promise.all(readers).then(newItems => {
      if (newItems.length > 0) setImages(prev => [...prev, ...newItems])
    })
  }, [])

  const removeImage = (id: string) => setImages(prev => prev.filter(i => i.id !== id))
  const moveImage = (index: number, dir: -1 | 1) => {
    setImages(prev => {
      const arr = [...prev]; const target = index + dir
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]]; return arr
    })
  }

  useEffect(() => {
    if (images.length === 0) return
    const img = new Image()
    img.onload = () => { setOutputWidth(img.naturalWidth); setOutputHeight(img.naturalHeight) }
    img.onerror = () => { /* ignore load error */ }
    img.src = images[0].src
  }, [images])

  const generateGIF = useCallback(async () => {
    if (images.length === 0) return
    setGenerating(true); setProgress(0); setGifUrl(null); setErrorMsg(null)
    try {
      const omggif = await import('omggif') as OmggifModule
      const GifWriter = omggif.GifWriter

      const canvas = document.createElement('canvas')
      canvas.width = outputWidth; canvas.height = outputHeight
      const ctx = canvas.getContext('2d')!

      const frameData: ImageData[] = []
      for (let i = 0; i < images.length; i++) {
        const img = new Image()
        img.src = images[i].src
        await new Promise<void>(r => { img.onload = () => r() })
        ctx.clearRect(0, 0, outputWidth, outputHeight)
        ctx.drawImage(img, 0, 0, outputWidth, outputHeight)
        frameData.push(ctx.getImageData(0, 0, outputWidth, outputHeight))
        setProgress(Math.round(((i + 1) / images.length) * 50))
      }

      const totalPixels = outputWidth * outputHeight
      const maxColors = Math.max(4, Math.min(256, Math.floor(256 * quality / 30)))
      const estimatedSize = totalPixels * 4 + 1024 * images.length + 100000
      const buf = new Uint8Array(estimatedSize)

      const gf = new GifWriter(buf, outputWidth, outputHeight, { loop: 0 })

      for (let i = 0; i < frameData.length; i++) {
        const data = frameData[i]
        const palette = buildPalette(data, maxColors)
        const indexed = quantizeImage(data, palette)
        gf.addFrame(0, 0, outputWidth, outputHeight, indexed, { palette, delay: Math.floor(frameDelay / 10) })
        setProgress(50 + Math.round(((i + 1) / frameData.length) * 50))
      }

      const final = buf.slice(0, gf.end())
      setGifUrl(URL.createObjectURL(new Blob([final], { type: 'image/gif' })))
    } catch (e) { console.error(e); setErrorMsg('GIF 生成失败: ' + (e instanceof Error ? e.message : '未知错误')) }
    finally { setGenerating(false) }
  }, [images, frameDelay, outputWidth, outputHeight, quality])

  const playPreview = () => {
    if (images.length <= 1) return
    setPlaying(true); setPreviewIndex(0)
    let idx = 0
    timerRef.current = window.setInterval(() => {
      idx++; if (idx >= images.length) { clearInterval(timerRef.current); setPlaying(false); return }
      setPreviewIndex(idx)
    }, frameDelay)
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  const download = () => {
    if (gifUrl) { const a = document.createElement('a'); a.href = gifUrl; a.download = `animated-${Date.now()}.gif`; a.click() }
  }

  return (
    <div className="app">
      <header><h1>{t('tools.gif-maker.title')}</h1><span>{t('tools.gif-maker.desc')}</span></header>
      <main>
        <div className="workspace">
          <div className="left-panel">
            <div className="drop-zone"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
              onClick={() => {
                const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.accept = 'image/*'
                input.onchange = e => handleFiles((e.target as HTMLInputElement).files!); input.click()
              }}>
              <span className="drop-icon">+</span>
              <p>拖拽或点击上传图片</p>
              <span className="count">{images.length} 张图片</span>
            </div>
            <div className="settings">
              <div className="setting-row">
                <label>帧间隔 (ms)</label>
                <input type="range" min="50" max="3000" value={frameDelay} onChange={e => setFrameDelay(+e.target.value)} />
                <span className="val">{frameDelay}ms</span>
              </div>
              <div className="setting-row">
                <label>输出宽度</label>
                <input type="number" value={outputWidth} onChange={e => setOutputWidth(+e.target.value)} min="10" max="1920" />
              </div>
              <div className="setting-row">
                <label>输出高度</label>
                <input type="number" value={outputHeight} onChange={e => setOutputHeight(+e.target.value)} min="10" max="1080" />
              </div>
              <div className="setting-row">
                <label>质量 (1-30)</label>
                <input type="range" min="1" max="30" value={quality} onChange={e => setQuality(+e.target.value)} />
                <span className="val">{quality}</span>
              </div>
            </div>
          </div>
          <div className="right-panel">
            <div className="frame-list">
              {images.length === 0 && <div className="empty-frames">暂无图片</div>}
              {images.map((img, i) => (
                <div key={img.id} className={`frame-item ${i === previewIndex && playing ? 'active' : ''}`}>
                  <span className="frame-index">{i + 1}</span>
                  <img src={img.src} alt={`frame-${i}`} />
                  <div className="frame-actions">
                    <button onClick={() => moveImage(i, -1)} disabled={i === 0}>&uarr;</button>
                    <button onClick={() => moveImage(i, 1)} disabled={i === images.length - 1}>&darr;</button>
                    <button onClick={() => removeImage(img.id)} className="del">&times;</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="preview-section">
          <h3>预览</h3>
          <div className="gif-preview">
            {gifUrl ? <img src={gifUrl} alt="Generated GIF" /> :
              images.length > 0 ? <img src={playing ? images[previewIndex]?.src : images[0]?.src} alt="preview" /> :
                <span>上传图片后在此预览</span>}
          </div>
        </div>
        {generating && (
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /><span>{progress}%</span></div>
        )}
        {errorMsg && <div className="error-msg">{errorMsg}</div>}
        <div className="actions">
          <button className="btn primary" onClick={generateGIF} disabled={images.length < 2 || generating}>
            {generating ? `生成中 ${progress}%` : '生成 GIF'}
          </button>
          <button className="btn" onClick={playPreview} disabled={images.length < 2 || playing}>播放预览</button>
          {gifUrl && <button className="btn primary" onClick={download}>下载 GIF</button>}
        </div>
      </main>
    </div>
  )
}

function buildPalette(imageData: ImageData, maxColors: number): number[] {
  const colorMap = new Map<string, number>()
  const data = imageData.data
  const step = Math.max(1, Math.floor(data.length / 4 / 10000))
  for (let i = 0; i < data.length; i += step * 4) {
    const r = data[i] >> 5; const g = data[i + 1] >> 5; const b = data[i + 2] >> 5
    const key = `${r},${g},${b}`
    colorMap.set(key, (colorMap.get(key) || 0) + 1)
  }
  const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxColors)
  const palette: number[] = []
  for (const [key] of sorted) {
    const [r, g, b] = key.split(',').map(Number)
    palette.push((r << 5) | (r >> 1), (g << 5) | (g >> 1), (b << 5) | (b >> 1))
  }
  while (palette.length < maxColors * 3) palette.push(0, 0, 0)
  return palette
}

function quantizeImage(imageData: ImageData, palette: number[]): Uint8Array {
  const data = imageData.data
  const pixelCount = imageData.width * imageData.height
  const indexed = new Uint8Array(pixelCount)
  const colorCount = palette.length / 3

  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4]; const g = data[i * 4 + 1]; const b = data[i * 4 + 2]
    let bestIdx = 0; let bestDist = Infinity
    for (let c = 0; c < colorCount; c++) {
      const pr = palette[c * 3]; const pg = palette[c * 3 + 1]; const pb = palette[c * 3 + 2]
      const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
      if (dist < bestDist) { bestDist = dist; bestIdx = c }
    }
    indexed[i] = bestIdx
  }
  return indexed
}

export default App