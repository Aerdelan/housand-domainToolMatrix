import { useState, useRef, useEffect, useCallback } from 'react'


import { useTranslation } from 'react-i18next'
interface MemeTemplate {
  name: string
  bg: string
}

const BUILTIN_TEMPLATES: MemeTemplate[] = [
  { name: '熊猫头', bg: '#ffffff' },
  { name: '黑底', bg: '#000000' },
  { name: '蓝底', bg: '#1a5276' },
  { name: '红底', bg: '#922b21' },
]

const STROKE_COLORS = ['#000000', '#ffffff', '#e94560', '#0f3460', '#2ecc71', '#f39c12']

export default function App() {
  const { t } = useTranslation();
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [template, setTemplate] = useState<string>('')
  const [topText, setTopText] = useState('')
  const [bottomText, setBottomText] = useState('')
  const [fontSize, setFontSize] = useState(42)
  const [fontColor, setFontColor] = useState('#ffffff')
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(3)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 500
    const H = 500
    canvas.width = W
    canvas.height = H

    // 背景
    if (bgImage) {
      const scale = Math.min(W / bgImage.width, H / bgImage.height)
      const dw = bgImage.width * scale
      const dh = bgImage.height * scale
      const dx = (W - dw) / 2
      const dy = (H - dh) / 2
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, W, H)
      ctx.drawImage(bgImage, dx, dy, dw, dh)
    } else if (template) {
      ctx.fillStyle = template
      ctx.fillRect(0, 0, W, H)
    } else {
      ctx.fillStyle = '#333'
      ctx.fillRect(0, 0, W, H)
    }

    // 文字样式
    ctx.textAlign = 'center'
    ctx.lineWidth = strokeWidth
    ctx.strokeStyle = strokeColor

    const lineHeight = fontSize * 1.3

    // 顶部文字
    if (topText) {
      const lines = wrapText(ctx, topText, W - 60)
      lines.forEach((line, i) => {
        const y = 40 + i * lineHeight + fontSize
        ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
        ctx.fillStyle = fontColor
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = strokeWidth
        ctx.strokeText(line, W / 2, y)
        ctx.fillText(line, W / 2, y)
      })
    }

    // 底部文字
    if (bottomText) {
      const lines = wrapText(ctx, bottomText, W - 60)
      const totalH = lines.length * lineHeight
      const baseY = H - 30 - totalH
      lines.forEach((line, i) => {
        const y = baseY + i * lineHeight + fontSize
        ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
        ctx.fillStyle = fontColor
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = strokeWidth
        ctx.strokeText(line, W / 2, y)
        ctx.fillText(line, W / 2, y)
      })
    }
  }, [bgImage, template, topText, bottomText, fontSize, fontColor, strokeColor, strokeWidth])

  useEffect(() => {
    draw()
  }, [draw])

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const lines: string[] = []
    let current = ''
    for (const ch of text) {
      const test = current + ch
      if (ctx.measureText(test).width > maxWidth && current.length > 0) {
        lines.push(current)
        current = ch
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
    return lines.length ? lines : [text]
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      setBgImage(img)
      setTemplate('')
    }
    img.src = URL.createObjectURL(file)
  }

  const selectTemplate = (t: MemeTemplate) => {
    setTemplate(t.bg)
    setBgImage(null)
  }

  const exportPNG = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'meme.png'
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t('tools.meme-generator.title')}</h1>
        <div style={styles.headerActions}>
          <button style={styles.btn} onClick={() => fileInputRef.current?.click()}>上传底图</button>
          <button style={styles.btnExport} onClick={exportPNG}>导出 PNG</button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
        </div>
      </header>

      <div style={styles.body}>
        {/* 左侧控制面板 */}
        <aside style={styles.panel}>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>模板背景</h3>
            <div style={styles.templateGrid}>
              {BUILTIN_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  style={{
                    ...styles.templateBtn,
                    background: t.bg,
                    border: template === t.bg ? '2px solid var(--accent)' : '2px solid var(--border)',
                  }}
                  onClick={() => selectTemplate(t)}
                  title={t.name}
                >
                  {t.name}
                </button>
              ))}
              {bgImage && (
                <button
                  style={{ ...styles.templateBtn, border: '2px solid var(--accent)', fontSize: 11 }}
                  onClick={() => { setBgImage(null); setTemplate('') }}
                >
                  已上传
                </button>
              )}
            </div>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>顶部文字</h3>
            <input
              style={styles.input}
              value={topText}
              onChange={(e) => setTopText(e.target.value)}
              placeholder="输入顶部文字..."
            />
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>底部文字</h3>
            <input
              style={styles.input}
              value={bottomText}
              onChange={(e) => setBottomText(e.target.value)}
              placeholder="输入底部文字..."
            />
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>字体大小: {fontSize}px</h3>
            <input
              type="range"
              min={16}
              max={80}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={styles.range}
            />
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>字体颜色</h3>
            <input type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} style={styles.colorInput} />
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>描边颜色</h3>
            <div style={styles.swatchRow}>
              {STROKE_COLORS.map((c) => (
                <button
                  key={c}
                  style={{
                    ...styles.swatch,
                    background: c,
                    border: strokeColor === c ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                  onClick={() => setStrokeColor(c)}
                />
              ))}
              <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} style={styles.colorInput} />
            </div>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>描边粗细: {strokeWidth}px</h3>
            <input
              type="range"
              min={0}
              max={10}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              style={styles.range}
            />
          </section>
        </aside>

        {/* 右侧预览区 */}
        <main style={styles.preview}>
          <canvas ref={canvasRef} style={styles.canvas} />
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
    transition: 'background 0.2s',
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
    width: 280,
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
  templateGrid: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  templateBtn: {
    width: 50,
    height: 38,
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    color: '#ccc',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: 13,
  },
  range: {
    width: '100%',
    accentColor: 'var(--accent)',
  },
  colorInput: {
    width: 32,
    height: 28,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  swatchRow: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 4,
    cursor: 'pointer',
  },
  preview: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#111122',
    overflow: 'auto',
    padding: 20,
  },
  canvas: {
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 8,
    boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
  },
}