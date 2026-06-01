import { useState, useRef, useEffect } from 'react'


import { useTranslation } from 'react-i18next'
type GridType = 2 | 3 | 4

export default function App() {
  const { t } = useTranslation();
  const [srcImage, setSrcImage] = useState<HTMLImageElement | null>(null)
  const [grid, setGrid] = useState<GridType>(3)
  const [slices, setSlices] = useState<string[]>([])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      setSrcImage(img)
      sliceImage(img, grid)
    }
    img.src = URL.createObjectURL(file)
  }

  // Auto-draw grid preview when srcImage or grid changes
  useEffect(() => {
    if (srcImage) drawGridOnCanvas()
  }, [srcImage, grid])

  const sliceImage = (img: HTMLImageElement, g: GridType) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    // 裁剪为正方形以适配网格
    const size = Math.min(img.width, img.height)
    const sx = (img.width - size) / 2
    const sy = (img.height - size) / 2

    const cellSize = size / g
    const result: string[] = []

    canvas.width = cellSize
    canvas.height = cellSize

    for (let row = 0; row < g; row++) {
      for (let col = 0; col < g; col++) {
        ctx.clearRect(0, 0, cellSize, cellSize)
        ctx.drawImage(
          img,
          sx + col * cellSize, sy + row * cellSize,
          cellSize, cellSize,
          0, 0,
          cellSize, cellSize,
        )
        result.push(canvas.toDataURL('image/png'))
      }
    }

    setSlices(result)
  }

  const changeGrid = (g: GridType) => {
    setGrid(g)
    if (srcImage) sliceImage(srcImage, g)
  }

  const downloadSlice = (dataUrl: string, index: number) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `slice_${index + 1}.png`
    a.click()
  }

  const downloadAll = () => {
    slices.forEach((url, i) => {
      setTimeout(() => downloadSlice(url, i), i * 50)
    })
  }

  // 预览整体切割效果
  const drawGridOnCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !srcImage) return
    const ctx = canvas.getContext('2d')!
    const W = 400, H = 400
    canvas.width = W
    canvas.height = H

    const size = Math.min(srcImage.width, srcImage.height)
    const sx = (srcImage.width - size) / 2
    const sy = (srcImage.height - size) / 2

    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, W, H)
    ctx.drawImage(srcImage, sx, sy, size, size, 0, 0, W, H)

    ctx.strokeStyle = 'rgba(233,69,96,0.8)'
    ctx.lineWidth = 2
    const cell = W / grid
    for (let i = 1; i < grid; i++) {
      ctx.beginPath()
      ctx.moveTo(i * cell, 0)
      ctx.lineTo(i * cell, H)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * cell)
      ctx.lineTo(W, i * cell)
      ctx.stroke()
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t('tools.grid-slicer.title')}</h1>
        <div style={styles.headerActions}>
          <button style={styles.btn} onClick={() => fileInputRef.current?.click()}>上传图片</button>
          <button style={{ ...styles.btnExport, opacity: slices.length === 0 ? 0.4 : 1, cursor: slices.length === 0 ? 'not-allowed' : 'pointer' }} onClick={downloadAll} disabled={slices.length === 0}>批量下载</button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
        </div>
      </header>

      <div style={styles.body}>
        <aside style={styles.panel}>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>网格选择</h3>
            <div style={styles.gridButtons}>
              {([2, 3, 4] as GridType[]).map((g) => (
                <button
                  key={g}
                  style={{
                    ...styles.gridBtn,
                    background: grid === g ? 'var(--accent)' : 'var(--bg-card)',
                  }}
                  onClick={() => changeGrid(g)}
                >
                  {g}×{g}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main style={styles.main}>
          {/* 预览 */}
          <div style={styles.previewArea}>
            <canvas ref={canvasRef} style={styles.previewCanvas} />
            {srcImage && (
              <button style={styles.btnSm} onClick={drawGridOnCanvas}>刷新预览</button>
            )}
          </div>

          {/* 每格切片 */}
          <div style={styles.slicesArea}>
            <h3 style={styles.slicesTitle}>
              切片预览 ({slices.length} 格)
            </h3>
            <div style={styles.slicesGrid}>
              {slices.map((url, i) => (
                <div key={i} style={styles.sliceItem}>
                  <img src={url} alt={`切片 ${i + 1}`} style={styles.sliceImg} />
                  <span style={styles.sliceLabel}>{i + 1}</span>
                  <button style={styles.dlBtn} onClick={() => downloadSlice(url, i)}>下载</button>
                </div>
              ))}
            </div>
            {!srcImage && (
              <p style={styles.placeholder}>请上传一张图片开始切割</p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--accent)',
  },
  headerActions: {
    display: 'flex',
    gap: 10,
  },
  btn: {
    padding: '8px 18px',
    borderRadius: 6,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  btnExport: {
    padding: '8px 18px',
    borderRadius: 6,
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
  },
  btnSm: {
    padding: '6px 14px',
    borderRadius: 4,
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontSize: 12,
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  panel: {
    width: 200,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    padding: '16px 14px',
    flexShrink: 0,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  gridButtons: {
    display: 'flex',
    gap: 8,
  },
  gridBtn: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 6,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  previewArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: '#111122',
  },
  previewCanvas: {
    maxWidth: '90%',
    maxHeight: '70%',
    borderRadius: 8,
  },
  slicesArea: {
    width: 380,
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border)',
    overflowY: 'auto',
    padding: '16px 14px',
    flexShrink: 0,
  },
  slicesTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  slicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  sliceItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  sliceImg: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    borderRadius: 4,
    border: '1px solid var(--border)',
  },
  sliceLabel: {
    fontSize: 11,
    color: 'var(--text-secondary)',
  },
  dlBtn: {
    padding: '3px 10px',
    borderRadius: 4,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: 11,
    cursor: 'pointer',
  },
  placeholder: {
    color: 'var(--text-secondary)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
}