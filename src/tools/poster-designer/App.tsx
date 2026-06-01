import { useState, useRef, useEffect, useCallback } from 'react'


import { useTranslation } from 'react-i18next'
interface TextElement {
  id: string
  type: 'text'
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
}

interface ImageElement {
  id: string
  type: 'image'
  x: number
  y: number
  w: number
  h: number
  src: string
  img: HTMLImageElement
}

interface ShapeElement {
  id: string
  type: 'shape'
  shape: 'rect' | 'circle'
  x: number
  y: number
  w: number
  h: number
  color: string
}

type CanvasElement = TextElement | ImageElement | ShapeElement

let idCounter = 0
const genId = () => `el_${++idCounter}`

const FONTS = ['PingFang SC', 'Microsoft YaHei', 'SimHei', 'Arial', 'Georgia', 'Courier New']

export default function App() {
  const { t } = useTranslation();
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [canvasW, setCanvasW] = useState(800)
  const [canvasH, setCanvasH] = useState(600)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [textFontSize, setTextFontSize] = useState(36)
  const [textFontFamily, setTextFontFamily] = useState('PingFang SC')
  const [textColor, setTextColor] = useState('#ffffff')
  const [shapeColor, setShapeColor] = useState('#e94560')
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null)
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; elW: number; elH: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasW
    canvas.height = canvasH

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvasW, canvasH)

    for (const el of elements) {
      if (el.type === 'shape') {
        ctx.fillStyle = el.color
        if (el.shape === 'rect') {
          ctx.fillRect(el.x, el.y, el.w, el.h)
        } else {
          ctx.beginPath()
          ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (el.type === 'image') {
        ctx.drawImage(el.img, el.x, el.y, el.w, el.h)
      } else if (el.type === 'text') {
        ctx.font = `${el.fontSize}px "${el.fontFamily}"`
        ctx.fillStyle = el.color
        ctx.textBaseline = 'top'
        ctx.fillText(el.text, el.x, el.y)
      }

      // 选中边框
      if (el.id === selectedId) {
        const bounds = getBounds(el)
        ctx.strokeStyle = '#e94560'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8)
        ctx.setLineDash([])

        // 缩放手柄
        if (el.type !== 'text') {
          const hx = bounds.x + bounds.w + 4
          const hy = bounds.y + bounds.h + 4
          ctx.fillStyle = '#e94560'
          ctx.fillRect(hx - 5, hy - 5, 10, 10)
        }
      }
    }
  }, [elements, selectedId, canvasW, canvasH])

  useEffect(() => {
    drawAll()
  }, [drawAll])

  const getBounds = (el: CanvasElement) => {
    if (el.type === 'text') {
      const canvas = canvasRef.current
      if (!canvas) return { x: el.x, y: el.y, w: 100, h: el.fontSize }
      const ctx = canvas.getContext('2d')!
      ctx.font = `${el.fontSize}px "${el.fontFamily}"`
      const metrics = ctx.measureText(el.text)
      return { x: el.x, y: el.y, w: metrics.width, h: el.fontSize }
    }
    return { x: el.x, y: el.y, w: el.w, h: el.h }
  }

  const hitTest = (mx: number, my: number): CanvasElement | null => {
    // 倒序遍历，选择最上层
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i]
      const b = getBounds(el)
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        return el
      }
    }
    return null
  }

  const toCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvasW / rect.width
    const scaleY = canvasH / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvasCoords(e)
    const hit = hitTest(x, y)
    if (hit) {
      setSelectedId(hit.id)
      // 检查是否点击缩放手柄
      if (hit.type !== 'text') {
        const b = getBounds(hit)
        const hx = b.x + b.w + 4
        const hy = b.y + b.h + 4
        if (Math.abs(x - hx) < 10 && Math.abs(y - hy) < 10) {
          setResizing({ id: hit.id, startX: x, startY: y, elW: hit.w, elH: hit.h })
          return
        }
      }
      setDragging({ id: hit.id, startX: x, startY: y, elX: hit.x, elY: hit.y })
    } else {
      setSelectedId(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvasCoords(e)
    if (dragging) {
      const dx = x - dragging.startX
      const dy = y - dragging.startY
      setElements((prev) =>
        prev.map((el) =>
          el.id === dragging.id
            ? { ...el, x: Math.max(0, dragging.elX + dx), y: Math.max(0, dragging.elY + dy) }
            : el,
        ),
      )
    } else if (resizing) {
      const dx = x - resizing.startX
      const dy = y - resizing.startY
      setElements((prev) =>
        prev.map((el) =>
          el.id === resizing.id
            ? { ...el, w: Math.max(20, resizing.elW + dx), h: Math.max(20, resizing.elH + dy) }
            : el,
        ),
      )
    }
  }

  const handleMouseUp = () => {
    setDragging(null)
    setResizing(null)
  }

  // 添加文字
  const addText = () => {
    if (!textInput.trim()) return
    const el: TextElement = {
      id: genId(),
      type: 'text',
      text: textInput,
      x: 100,
      y: 100 + elements.length * 20,
      fontSize: textFontSize,
      fontFamily: textFontFamily,
      color: textColor,
    }
    setElements((prev) => [...prev, el])
    setSelectedId(el.id)
  }

  // 添加图片
  const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(300 / img.width, 300 / img.height, 1)
      const el: ImageElement = {
        id: genId(),
        type: 'image',
        x: 120 + elements.length * 40,
        y: 120 + elements.length * 30,
        w: img.width * scale,
        h: img.height * scale,
        src: URL.createObjectURL(file),
        img,
      }
      setElements((prev) => [...prev, el])
      setSelectedId(el.id)
    }
    img.src = URL.createObjectURL(file)
  }

  // 添加形状
  const addShape = (shape: 'rect' | 'circle') => {
    const el: ShapeElement = {
      id: genId(),
      type: 'shape',
      shape,
      x: 150 + elements.length * 40,
      y: 150 + elements.length * 30,
      w: 120,
      h: shape === 'circle' ? 120 : 80,
      color: shapeColor,
    }
    setElements((prev) => [...prev, el])
    setSelectedId(el.id)
  }

  // 删除选中元素
  const deleteSelected = () => {
    if (!selectedId) return
    setElements((prev) => prev.filter((el) => el.id !== selectedId))
    setSelectedId(null)
  }

  // 修改选中文字
  const updateSelectedText = (key: string, value: string | number) => {
    if (!selectedId) return
    setElements((prev) =>
      prev.map((el) =>
        el.id === selectedId && el.type === 'text'
          ? { ...el, [key]: value }
          : el,
      ),
    )
  }

  // 导出 PNG
  const exportPNG = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `poster_${canvasW}x${canvasH}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const selectedEl = elements.find((e) => e.id === selectedId)

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t('tools.poster-designer.title')}</h1>
        <div style={styles.headerActions}>
          <button style={styles.btn} onClick={deleteSelected} disabled={!selectedId}>删除选中</button>
          <button style={styles.btnExport} onClick={exportPNG}>导出 PNG</button>
        </div>
      </header>

      <div style={styles.body}>
        <aside style={styles.panel}>
          {/* 画布尺寸 */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>画布尺寸</h3>
            <div style={styles.sizeRow}>
              <input
                type="number"
                value={canvasW}
                onChange={(e) => setCanvasW(Math.max(200, Number(e.target.value)))}
                style={styles.sizeInput}
                placeholder="宽"
              />
              <span style={styles.xSep}>×</span>
              <input
                type="number"
                value={canvasH}
                onChange={(e) => setCanvasH(Math.max(200, Number(e.target.value)))}
                style={styles.sizeInput}
                placeholder="高"
              />
            </div>
          </section>

          {/* 添加文字 */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>添加文字</h3>
            <input
              style={styles.input}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="输入文字..."
            />
            <div style={styles.inlineRow}>
              <select
                style={styles.select}
                value={textFontFamily}
                onChange={(e) => setTextFontFamily(e.target.value)}
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <input
                type="number"
                value={textFontSize}
                onChange={(e) => setTextFontSize(Math.max(8, Number(e.target.value)))}
                style={styles.numInput}
                min={8}
              />
            </div>
            <div style={styles.inlineRow}>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={styles.colorInput} />
              <button style={styles.addBtn} onClick={addText}>添加文字</button>
            </div>
          </section>

          {/* 添加图片 */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>添加图片</h3>
            <button style={styles.addBtn} onClick={() => imageInputRef.current?.click()}>选择图片添加</button>
            <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addImage} />
          </section>

          {/* 添加形状 */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>添加形状</h3>
            <div style={styles.inlineRow}>
              <input type="color" value={shapeColor} onChange={(e) => setShapeColor(e.target.value)} style={styles.colorInput} />
            </div>
            <div style={styles.toolRow}>
              <button style={styles.addBtn} onClick={() => addShape('rect')}>矩形</button>
              <button style={styles.addBtn} onClick={() => addShape('circle')}>圆形</button>
            </div>
          </section>

          {/* 选中元素属性 */}
          {selectedEl && selectedEl.type === 'text' && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>编辑文字</h3>
              <input
                style={styles.input}
                value={selectedEl.text}
                onChange={(e) => updateSelectedText('text', e.target.value)}
              />
              <div style={styles.inlineRow}>
                <span style={styles.label}>字号</span>
                <input
                  type="number"
                  value={selectedEl.fontSize}
                  onChange={(e) => updateSelectedText('fontSize', Math.max(8, Number(e.target.value)))}
                  style={styles.numInput}
                />
              </div>
              <input
                type="color"
                value={selectedEl.color}
                onChange={(e) => updateSelectedText('color', e.target.value)}
                style={styles.colorInput}
              />
            </section>
          )}

          <p style={styles.hint}>拖拽元素移动位置 · 右下角手柄缩放</p>
        </aside>

        <main style={styles.main}>
          <div style={styles.canvasWrapper}>
            <canvas
              ref={canvasRef}
              style={{
                ...styles.canvas,
                maxWidth: canvasW,
                maxHeight: canvasH,
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
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
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  panel: {
    width: 260,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    overflowY: 'auto',
    padding: '16px 14px',
    flexShrink: 0,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: 13,
    marginBottom: 6,
  },
  select: {
    flex: 1,
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: 12,
  },
  numInput: {
    width: 60,
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: 12,
  },
  sizeInput: {
    flex: 1,
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: 13,
    width: 60,
    textAlign: 'center' as const,
  },
  sizeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  xSep: {
    color: 'var(--text-secondary)',
    fontWeight: 700,
  },
  inlineRow: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    marginBottom: 6,
  },
  colorInput: {
    width: 32,
    height: 28,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  addBtn: {
    flex: 1,
    padding: '7px 0px',
    borderRadius: 6,
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  toolRow: {
    display: 'flex',
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
  },
  hint: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    marginTop: 8,
    lineHeight: 1.6,
  },
  main: {
    flex: 1,
    background: '#0d0d1a',
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  canvasWrapper: {
    boxShadow: '0 4px 30px rgba(0,0,0,0.6)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  canvas: {
    display: 'block',
    cursor: 'default',
  },
}