import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'
import { useTranslation } from 'react-i18next'

interface ImageItem {
  id: string
  src: string
  file: File
  width: number
  height: number
}

type Position = 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'

function App() {
  const { t } = useTranslation();
  const [images, setImages] = useState<ImageItem[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [mode, setMode] = useState<'text' | 'image'>('text')

  // Text watermark state
  const [text, setText] = useState('Watermark')
  const [fontSize, setFontSize] = useState(48)
  const [fontColor, setFontColor] = useState('#ffffff')
  const [textOpacity, setTextOpacity] = useState(0.5)
  const [textPosition, setTextPosition] = useState<Position>('center')
  const [rotation, setRotation] = useState(-30)
  const [tile, setTile] = useState(false)

  // Image watermark state
  const [watermarkImg, setWatermarkImg] = useState<HTMLImageElement | null>(null)
  const [watermarkSrc, setWatermarkSrc] = useState<string | null>(null)
  const [wmScale, setWmScale] = useState(30)
  const [wmOpacity, setWmOpacity] = useState(0.6)
  const [wmPosition, setWmPosition] = useState<Position>('bottomRight')
  const [wmMargin, setWmMargin] = useState(20)

  const [processing, setProcessing] = useState(false)
  const [processedUrls, setProcessedUrls] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const handleFiles = useCallback((files: FileList | File[]) => {
    const items: ImageItem[] = []
    const readers: Promise<ImageItem>[] = []
    Array.from(files).forEach(f => {
      if (!f.type.startsWith('image/')) return
      const promise = new Promise<ImageItem>(resolve => {
        const img = new Image()
        img.onload = () => resolve({
          id: Math.random().toString(36).slice(2),
          src: URL.createObjectURL(f),
          file: f,
          width: img.naturalWidth,
          height: img.naturalHeight
        })
        img.src = URL.createObjectURL(f)
      })
      readers.push(promise)
    })
    Promise.all(readers).then(newItems => {
      if (newItems.length > 0) setImages(prev => [...prev, ...newItems])
    })
  }, [])

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(i => i.id !== id))
  }

  // Clamp selectedIdx when images change
  useEffect(() => {
    if (images.length > 0 && selectedIdx >= images.length) {
      setSelectedIdx(images.length - 1)
    }
  }, [images.length, selectedIdx])

  const handleWatermarkImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => { setWatermarkImg(img); setWatermarkSrc(URL.createObjectURL(file)) }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  const drawWatermarkOverlay = useCallback((ctx: CanvasRenderingContext2D, imgW: number, imgH: number) => {
    if (mode === 'text') {
      ctx.save()
      ctx.globalAlpha = textOpacity
      ctx.font = `${fontSize}px "Microsoft YaHei", sans-serif`
      ctx.fillStyle = fontColor

      const metrics = ctx.measureText(text)
      const tw = metrics.width
      const th = fontSize

      if (tile) {
        ctx.translate(imgW / 2, imgH / 2)
        ctx.rotate((rotation * Math.PI) / 180)
        const spacing = Math.max(tw, th) * 2.5
        for (let y = -imgH; y < imgH * 2; y += spacing) {
          for (let x = -imgW; x < imgW * 2; x += spacing) {
            ctx.fillText(text, x, y)
          }
        }
      } else {
        const posMap: Record<Position, [number, number]> = {
          center: [imgW / 2 - tw / 2, imgH / 2 + th / 3],
          topLeft: [40, 40 + th],
          topRight: [imgW - tw - 40, 40 + th],
          bottomLeft: [40, imgH - 40],
          bottomRight: [imgW - tw - 40, imgH - 40],
        }
        const [x, y] = posMap[textPosition]
        ctx.translate(x + tw / 2, y - th / 3)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.fillText(text, -tw / 2, th / 3)
      }
      ctx.restore()
    } else if (mode === 'image' && watermarkImg) {
      ctx.save()
      ctx.globalAlpha = wmOpacity
      const scale = wmScale / 100
      const ww = watermarkImg.width * scale
      const wh = watermarkImg.height * scale

      const posMap: Record<Position, [number, number]> = {
        center: [imgW / 2 - ww / 2, imgH / 2 - wh / 2],
        topLeft: [wmMargin, wmMargin],
        topRight: [imgW - ww - wmMargin, wmMargin],
        bottomLeft: [wmMargin, imgH - wh - wmMargin],
        bottomRight: [imgW - ww - wmMargin, imgH - wh - wmMargin],
      }
      const [x, y] = posMap[wmPosition]
      ctx.drawImage(watermarkImg, x, y, ww, wh)
      ctx.restore()
    }
  }, [mode, text, fontSize, fontColor, textOpacity, textPosition, rotation, tile, watermarkImg, wmScale, wmOpacity, wmPosition, wmMargin])

  const renderToCanvas = useCallback(async (canvas: HTMLCanvasElement, img: ImageItem): Promise<void> => {
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!

    const baseImg = new Image()
    await new Promise<void>((resolve, reject) => {
      baseImg.onload = () => resolve()
      baseImg.onerror = () => reject(new Error('图片加载失败'))
      baseImg.src = img.src
    })
    ctx.drawImage(baseImg, 0, 0)
    drawWatermarkOverlay(ctx, img.width, img.height)
  }, [drawWatermarkOverlay])

  // Re-render preview when state changes
  useEffect(() => {
    if (images.length === 0 || !previewCanvasRef.current) return
    let cancelled = false
    renderToCanvas(previewCanvasRef.current, images[selectedIdx]).catch(() => {
      if (!cancelled) { /* silently ignore render errors */ }
    })
    return () => { cancelled = true }
  }, [images, selectedIdx, renderToCanvas])

  const batchExport = useCallback(async () => {
    if (images.length === 0) return
    setProcessing(true)
    setErrorMsg(null)
    const urls: string[] = []
    const canvas = document.createElement('canvas')

    try {
      for (const img of images) {
        await renderToCanvas(canvas, img)
        const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/png'))
        urls.push(URL.createObjectURL(blob))
      }
      setProcessedUrls(urls)
    } catch (e) { console.error(e); setErrorMsg('批量处理失败: ' + (e instanceof Error ? e.message : '未知错误')) }
    finally { setProcessing(false) }
  }, [images, renderToCanvas])

  const downloadAll = () => {
    processedUrls.forEach((url, i) => {
      const a = document.createElement('a')
      a.href = url
      a.download = `watermarked-${i + 1}.png`
      a.click()
    })
  }

  return (
    <div className="app">
      <header><h1>{t('tools.watermark-tool.title')}</h1><span>{t('tools.watermark-tool.desc')}</span></header>
      <main>
        <div className="upload-section">
          <div className="drop-zone" onClick={() => {
            const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'image/*'
            inp.onchange = e => handleFiles((e.target as HTMLInputElement).files!); inp.click()
          }}>
            <span className="drop-icon">+</span>
            <p>上传图片（支持批量）</p>
            <span className="count">{images.length} 张</span>
          </div>

          {images.length > 0 && (
            <div className="image-strip">
              {images.map((img, i) => (
                <div key={img.id} className={`thumb ${i === selectedIdx ? 'active' : ''}`}
                  onClick={() => setSelectedIdx(i)}>
                  <img src={img.src} alt={`img-${i}`} />
                  <button className="thumb-del" onClick={e => { e.stopPropagation(); removeImage(img.id) }}>&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {images.length > 0 && (
          <div className="workspace">
            <div className="left-panel">
              <div className="mode-tabs">
                <button className={`tab ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>文字水印</button>
                <button className={`tab ${mode === 'image' ? 'active' : ''}`} onClick={() => setMode('image')}>图片水印</button>
              </div>

              {mode === 'text' && (
                <div className="settings">
                  <div className="setting-row">
                    <label>文字内容</label>
                    <input type="text" value={text} onChange={e => setText(e.target.value)} />
                  </div>
                  <div className="setting-row">
                    <label>字体大小 ({fontSize}px)</label>
                    <input type="range" min="12" max="200" value={fontSize} onChange={e => { setFontSize(+e.target.value) }} />
                  </div>
                  <div className="setting-row">
                    <label>颜色</label>
                    <input type="color" value={fontColor} onChange={e => { setFontColor(e.target.value) }} />
                  </div>
                  <div className="setting-row">
                    <label>透明度</label>
                    <input type="range" min="0.05" max="1" step="0.05" value={textOpacity} onChange={e => { setTextOpacity(+e.target.value) }} />
                  </div>
                  <div className="setting-row">
                    <label>旋转角度 ({rotation}°)</label>
                    <input type="range" min="-180" max="180" value={rotation} onChange={e => { setRotation(+e.target.value) }} />
                  </div>
                  <div className="setting-row">
                    <label>位置</label>
                    <select value={textPosition} onChange={e => { setTextPosition(e.target.value as Position) }}>
                      <option value="center">居中</option>
                      <option value="topLeft">左上</option>
                      <option value="topRight">右上</option>
                      <option value="bottomLeft">左下</option>
                      <option value="bottomRight">右下</option>
                    </select>
                  </div>
                  <div className="setting-row">
                    <label>
                      <input type="checkbox" checked={tile} onChange={e => { setTile(e.target.checked) }} />
                      平铺模式
                    </label>
                  </div>
                </div>
              )}

              {mode === 'image' && (
                <div className="settings">
                  <div className="setting-row">
                    <label>水印图片</label>
                    <button className="btn sm" onClick={() => {
                      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'
                      inp.onchange = e => handleWatermarkImage((e.target as HTMLInputElement).files![0]); inp.click()
                    }}>上传水印图</button>
                    {watermarkSrc && <img src={watermarkSrc} className="wm-thumb" />}
                  </div>
                  <div className="setting-row">
                    <label>大小 ({wmScale}%)</label>
                    <input type="range" min="5" max="100" value={wmScale} onChange={e => { setWmScale(+e.target.value) }} />
                  </div>
                  <div className="setting-row">
                    <label>透明度</label>
                    <input type="range" min="0.05" max="1" step="0.05" value={wmOpacity} onChange={e => { setWmOpacity(+e.target.value) }} />
                  </div>
                  <div className="setting-row">
                    <label>位置</label>
                    <select value={wmPosition} onChange={e => { setWmPosition(e.target.value as Position) }}>
                      <option value="center">居中</option>
                      <option value="topLeft">左上</option>
                      <option value="topRight">右上</option>
                      <option value="bottomLeft">左下</option>
                      <option value="bottomRight">右下</option>
                    </select>
                  </div>
                  <div className="setting-row">
                    <label>边距 ({wmMargin}px)</label>
                    <input type="range" min="0" max="100" value={wmMargin} onChange={e => { setWmMargin(+e.target.value) }} />
                  </div>
                </div>
              )}
            </div>

            <div className="right-panel">
              <h3>预览</h3>
              <div className="preview-box">
                <canvas ref={previewCanvasRef} className="preview-canvas" />
              </div>
              <div className="image-info">
                第 {selectedIdx + 1} / {images.length} 张 | {images[selectedIdx]?.width} x {images[selectedIdx]?.height}
              </div>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="actions">
            <button className="btn primary" onClick={batchExport} disabled={processing}>
              {processing ? '处理中...' : `批量处理 (${images.length} 张)`}
            </button>
            {processedUrls.length > 0 && (
              <button className="btn primary" onClick={downloadAll}>批量下载 PNG</button>
            )}
          </div>
        )}
        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        {processedUrls.length > 0 && (
          <div className="results">
            <h3>导出结果</h3>
            <div className="result-grid">
              {processedUrls.map((url, i) => (
                <div key={i} className="result-item">
                  <img src={url} alt={`result-${i}`} />
                  <a href={url} download={`watermarked-${i + 1}.png`}>下载</a>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App