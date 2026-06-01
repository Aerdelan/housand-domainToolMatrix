import { useState, useRef, useCallback, useEffect } from 'react'
import QRCode from 'qrcode'
import './App.css'
import { useTranslation } from 'react-i18next'

type Preset = 'url' | 'text' | 'phone' | 'email' | 'wifi' | 'vcard'

const presetLabels: Record<Preset, string> = {
  url: 'URL链接',
  text: '文本',
  phone: '手机号',
  email: '邮箱',
  wifi: 'WiFi信息',
  vcard: 'vCard名片',
}

interface WifiFields {
  ssid: string
  password: string
  encryption: 'WPA' | 'WEP' | 'none'
}

interface VCardFields {
  name: string
  phone: string
  email: string
  org: string
}

const errorLevels: { label: string; value: QRCode.QRCodeErrorCorrectionLevel }[] = [
  { label: 'L (7%)', value: 'low' },
  { label: 'M (15%)', value: 'medium' },
  { label: 'Q (25%)', value: 'quartile' },
  { label: 'H (30%)', value: 'high' },
]

function App() {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<Preset>('url')
  const [text, setText] = useState('')
  const [wifi, setWifi] = useState<WifiFields>({ ssid: '', password: '', encryption: 'WPA' })
  const [vcard, setVCard] = useState<VCardFields>({ name: '', phone: '', email: '', org: '' })
  const [fgColor, setFgColor] = useState('#ffffff')
  const [bgColor, setBgColor] = useState('#0f0f0f')
  const [size, setSize] = useState(280)
  const [errorLevel, setErrorLevel] = useState<QRCode.QRCodeErrorCorrectionLevel>('medium')
  const [logo, setLogo] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const getContent = useCallback((): string => {
    switch (preset) {
      case 'url': return text || 'https://'
      case 'text': return text
      case 'phone': return `tel:${text}`
      case 'email': return `mailto:${text}`
      case 'wifi': return `WIFI:T:${wifi.encryption};S:${wifi.ssid};P:${wifi.password};;`
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${vcard.name}\nTEL:${vcard.phone}\nEMAIL:${vcard.email}\nORG:${vcard.org}\nEND:VCARD`
    }
  }, [preset, text, wifi, vcard])

  const generate = useCallback(async () => {
    const content = getContent()
    if (!content.trim() && preset !== 'url') return

    const canvas = canvasRef.current
    if (!canvas) return

    try {
      await QRCode.toCanvas(canvas, content || ' ', {
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: errorLevel,
      })

      if (logo) {
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const img = new Image()
        img.src = logo
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const logoSize = size * 0.2
            const x = (size - logoSize) / 2
            const y = (size - logoSize) / 2
            // white background for logo
            ctx.fillStyle = bgColor
            ctx.fillRect(x - 4, y - 4, logoSize + 8, logoSize + 8)
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(x - 2, y - 2, logoSize + 4, logoSize + 4)
            ctx.drawImage(img, x, y, logoSize, logoSize)
            resolve()
          }
        })
      }

      setQrDataUrl(canvas.toDataURL('image/png'))
    } catch (e) {
      console.error('QR generation failed:', e)
    }
  }, [getContent, size, fgColor, bgColor, errorLevel, logo, preset])

  useEffect(() => {
    const t = setTimeout(generate, 150)
    return () => clearTimeout(t)
  }, [generate])

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogo(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const removeLogo = () => setLogo(null)

  const exportPNG = useCallback(() => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.download = 'qrcode.png'
    link.href = qrDataUrl
    link.click()
  }, [qrDataUrl])

  return (
    <div className="app">
      <header className="header">
        <h1>{t('tools.qr-generator.title')}</h1>
        <p className="subtitle">{t('tools.qr-generator.desc')}</p>
      </header>

      <div className="qr-layout">
        <div className="qr-settings">
          <div className="preset-tabs">
            {(Object.keys(presetLabels) as Preset[]).map(p => (
              <button
                key={p}
                className={`preset-btn ${preset === p ? 'active' : ''}`}
                onClick={() => setPreset(p)}
              >
                {presetLabels[p]}
              </button>
            ))}
          </div>

          <div className="field-group">
            {preset === 'url' && (
              <input className="field-input" placeholder="https://example.com" value={text} onChange={e => setText(e.target.value)} />
            )}
            {preset === 'text' && (
              <textarea className="field-textarea" placeholder="输入文本内容..." value={text} onChange={e => setText(e.target.value)} rows={4} />
            )}
            {preset === 'phone' && (
              <input className="field-input" placeholder="+86 13800138000" value={text} onChange={e => setText(e.target.value)} />
            )}
            {preset === 'email' && (
              <input className="field-input" placeholder="user@example.com" value={text} onChange={e => setText(e.target.value)} />
            )}
            {preset === 'wifi' && (
              <div className="wifi-form">
                <input placeholder="WiFi名称 (SSID)" value={wifi.ssid} onChange={e => setWifi({ ...wifi, ssid: e.target.value })} />
                <input placeholder="密码" value={wifi.password} onChange={e => setWifi({ ...wifi, password: e.target.value })} />
                <select value={wifi.encryption} onChange={e => setWifi({ ...wifi, encryption: e.target.value as 'WPA' | 'WEP' | 'none' })}>
                  <option value="WPA">WPA/WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="none">无加密</option>
                </select>
              </div>
            )}
            {preset === 'vcard' && (
              <div className="vcard-form">
                <input placeholder="姓名" value={vcard.name} onChange={e => setVCard({ ...vcard, name: e.target.value })} />
                <input placeholder="电话" value={vcard.phone} onChange={e => setVCard({ ...vcard, phone: e.target.value })} />
                <input placeholder="邮箱" value={vcard.email} onChange={e => setVCard({ ...vcard, email: e.target.value })} />
                <input placeholder="组织" value={vcard.org} onChange={e => setVCard({ ...vcard, org: e.target.value })} />
              </div>
            )}
          </div>

          <div className="style-options">
            <div className="style-row">
              <label>前景色</label>
              <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} />
            </div>
            <div className="style-row">
              <label>背景色</label>
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
            </div>
            <div className="style-row">
              <label>尺寸</label>
              <input type="range" min={150} max={500} value={size} onChange={e => setSize(Number(e.target.value))} />
              <span>{size}px</span>
            </div>
            <div className="style-row">
              <label>纠错等级</label>
              <select value={errorLevel} onChange={e => setErrorLevel(e.target.value as QRCode.QRCodeErrorCorrectionLevel)}>
                {errorLevels.map(el => (
                  <option key={el.value} value={el.value}>{el.label}</option>
                ))}
              </select>
            </div>
            <div className="style-row">
              <label>中心Logo</label>
              <div className="logo-controls">
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
                {logo && <button className="btn-small" onClick={removeLogo}>移除Logo</button>}
              </div>
            </div>
          </div>
        </div>

        <div className="qr-preview">
          <canvas ref={canvasRef} width={size} height={size} style={{ display: 'none' }} />
          {qrDataUrl ? (
            <div className="qr-display">
              <img src={qrDataUrl} alt="QR Code" style={{ width: size, height: size, borderRadius: '8px' }} />
              <button className="btn-export" onClick={exportPNG}>导出 PNG</button>
            </div>
          ) : (
            <div className="qr-placeholder">输入内容以生成二维码</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App