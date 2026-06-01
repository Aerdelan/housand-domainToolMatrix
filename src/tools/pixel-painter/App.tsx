import { useState, useRef, useEffect, useCallback } from 'react'


import { useTranslation } from 'react-i18next'
const DEFAULT_SIZE = 32
const CANVAS_DISPLAY = 512
const COLORS = [
  '#000000', '#ffffff', '#ff0000', '#ff8800', '#ffff00',
  '#00ff00', '#00ffff', '#0088ff', '#8800ff', '#ff00ff',
  '#333333', '#888888', '#cccccc', '#aa4444', '#44aa44',
  '#4444aa', '#aa8844', '#44aaaa', '#aa44aa', '#88aa44',
]

export default function App() {
  const { t } = useTranslation();
  const [gridSize, setGridSize] = useState(DEFAULT_SIZE)
  const [pixels, setPixels] = useState<string[][]>(() =>
    Array.from({ length: DEFAULT_SIZE }, () => Array(DEFAULT_SIZE).fill('#ffffff'))
  )
  const [currentColor, setCurrentColor] = useState('#000000')
  const [isErasing, setIsErasing] = useState(false)
  const [scale, setScale] = useState(4)
  const [isDrawing, setIsDrawing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const cellSize = CANVAS_DISPLAY / gridSize

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = CANVAS_DISPLAY
    canvas.height = CANVAS_DISPLAY

    // 背景
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, CANVAS_DISPLAY, CANVAS_DISPLAY)

    // 画像素
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        ctx.fillStyle = pixels[r]?.[c] || '#ffffff'
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
      }
    }

    // 网格线
    if (cellSize > 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.5
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath()
        ctx.moveTo(i * cellSize, 0)
        ctx.lineTo(i * cellSize, CANVAS_DISPLAY)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * cellSize)
        ctx.lineTo(CANVAS_DISPLAY, i * cellSize)
        ctx.stroke()
      }
    }
  }, [pixels, gridSize, cellSize])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const getCell = (e: React.MouseEvent<HTMLCanvasElement>): { r: number; c: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_DISPLAY / rect.width
    const scaleY = CANVAS_DISPLAY / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const c = Math.floor(x / cellSize)
    const r = Math.floor(y / cellSize)
    if (c < 0 || c >= gridSize || r < 0 || r >= gridSize) return null
    return { r, c }
  }

  const paintCell = (r: number, c: number) => {
    setPixels((prev) => {
      const next = prev.map((row) => [...row])
      next[r][c] = isErasing ? '#ffffff' : currentColor
      return next
    })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const cell = getCell(e)
    if (cell) paintCell(cell.r, cell.c)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const cell = getCell(e)
    if (cell) paintCell(cell.r, cell.c)
  }

  const handleMouseUp = () => setIsDrawing(false)

  const clearAll = () => {
    setPixels(Array.from({ length: gridSize }, () => Array(gridSize).fill('#ffffff')))
  }

  const resizeGrid = (newSize: number) => {
    setGridSize(newSize)
    setPixels(Array.from({ length: newSize }, () => Array(newSize).fill('#ffffff')))
  }

  const exportPNG = () => {
    const exportCanvas = document.createElement('canvas')
    const size = gridSize * scale
    exportCanvas.width = size
    exportCanvas.height = size
    const ctx = exportCanvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        ctx.fillStyle = pixels[r]?.[c] || '#ffffff'
        ctx.fillRect(c * scale, r * scale, scale, scale)
      }
    }

    exportCanvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pixel_${gridSize}x${gridSize}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t('tools.pixel-painter.title')}</h1>
        <div style={styles.headerActions}>
          <button style={styles.btn} onClick={clearAll}>清空</button>
          <button style={styles.btnExport} onClick={exportPNG}>导出 PNG</button>
        </div>
      </header>

      <div style={styles.body}>
        <aside style={styles.panel}>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>画布尺寸: {gridSize}×{gridSize}</h3>
            <input
              type="range"
              min={8}
              max={64}
              value={gridSize}
              onChange={(e) => resizeGrid(Number(e.target.value))}
              style={styles.range}
            />
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>工具</h3>
            <div style={styles.toolRow}>
              <button
                style={{
                  ...styles.toolBtn,
                  background: !isErasing ? 'var(--accent)' : 'var(--bg-card)',
                }}
                onClick={() => setIsErasing(false)}
              >
                画笔
              </button>
              <button
                style={{
                  ...styles.toolBtn,
                  background: isErasing ? 'var(--warning)' : 'var(--bg-card)',
                }}
                onClick={() => setIsErasing(true)}
              >
                橡皮擦
              </button>
            </div>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>当前颜色</h3>
            <div style={{ ...styles.colorPreview, background: isErasing ? '#ffffff' : currentColor }} />
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>调色板</h3>
            <div style={styles.palette}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  style={{
                    ...styles.colorBtn,
                    background: c,
                    border: currentColor === c && !isErasing ? '3px solid var(--accent)' : '1px solid var(--border)',
                  }}
                  onClick={() => { setCurrentColor(c); setIsErasing(false) }}
                />
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>导出放大: {scale}x</h3>
            <input
              type="range"
              min={1}
              max={16}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              style={styles.range}
            />
          </section>
        </aside>

        <main style={styles.main}>
          <canvas
            ref={canvasRef}
            style={styles.canvas}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
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
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  panel: {
    width: 220,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    overflowY: 'auto',
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
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  range: {
    width: '100%',
    accentColor: 'var(--accent)',
    marginTop: 4,
  },
  toolRow: {
    display: 'flex',
    gap: 8,
  },
  toolBtn: {
    flex: 1,
    padding: '8px 0',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 6,
    border: '2px solid var(--border)',
  },
  palette: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 6,
  },
  colorBtn: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#111122',
    padding: 20,
  },
  canvas: {
    maxWidth: '90%',
    maxHeight: '90%',
    borderRadius: 8,
    imageRendering: 'pixelated',
    cursor: 'crosshair',
    boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
  },
}