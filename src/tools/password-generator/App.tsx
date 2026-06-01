import { useState, useCallback, useMemo } from 'react'
import './App.css'
import { useTranslation } from 'react-i18next'

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const SIMILAR = '1lI0Oo'

function removeSimilar(chars: string): string {
  return chars.split('').filter(c => !SIMILAR.includes(c)).join('')
}

type Strength = 'weak' | 'medium' | 'strong' | 'very-strong'

function calcStrength(password: string): { level: Strength; label: string; score: number } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 2) return { level: 'weak', label: '弱', score }
  if (score <= 3) return { level: 'medium', label: '中', score }
  if (score <= 5) return { level: 'strong', label: '强', score }
  return { level: 'very-strong', label: '极强', score }
}

function App() {
  const { t } = useTranslation();
  const [length, setLength] = useState(16)
  const [useUpper, setUseUpper] = useState(true)
  const [useLower, setUseLower] = useState(true)
  const [useDigits, setUseDigits] = useState(true)
  const [useSymbols, setUseSymbols] = useState(true)
  const [excludeSimilar, setExcludeSimilar] = useState(false)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = useCallback(() => {
    let pool = ''
    if (useUpper) pool += UPPERCASE
    if (useLower) pool += LOWERCASE
    if (useDigits) pool += DIGITS
    if (useSymbols) pool += SYMBOLS
    if (excludeSimilar) pool = removeSimilar(pool)

    if (!pool) {
      setPassword('')
      return
    }

    const arr = new Uint32Array(length)
    crypto.getRandomValues(arr)
    let result = ''
    for (let i = 0; i < length; i++) {
      result += pool[arr[i] % pool.length]
    }
    setPassword(result)
    setCopied(false)
  }, [length, useUpper, useLower, useDigits, useSymbols, excludeSimilar])

  const copyToClipboard = useCallback(async () => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = password
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [password])

  const strength = useMemo(() => calcStrength(password), [password])

  const strengthColors: Record<Strength, string> = {
    'weak': 'var(--danger)',
    'medium': 'var(--warning)',
    'strong': 'var(--accent)',
    'very-strong': 'var(--success)',
  }

  return (
    <div className="app">
      <header className="header">
        <h1>{t('tools.password-generator.title')}</h1>
        <p className="subtitle">安全随机 · 自定义规则 · 实时强度检测</p>
      </header>

      <div className="options">
        <div className="option-row">
          <label>密码长度：<strong>{length}</strong></label>
          <input
            type="range"
            min={4}
            max={128}
            value={length}
            onChange={e => setLength(Number(e.target.value))}
            className="slider"
          />
          <div className="range-labels"><span>4</span><span>128</span></div>
        </div>

        <div className="checks">
          <label className="check-label">
            <input type="checkbox" checked={useUpper} onChange={e => setUseUpper(e.target.checked)} />
            大写字母 (A-Z)
          </label>
          <label className="check-label">
            <input type="checkbox" checked={useLower} onChange={e => setUseLower(e.target.checked)} />
            小写字母 (a-z)
          </label>
          <label className="check-label">
            <input type="checkbox" checked={useDigits} onChange={e => setUseDigits(e.target.checked)} />
            数字 (0-9)
          </label>
          <label className="check-label">
            <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} />
            特殊符号 (!@#$...)
          </label>
          <label className="check-label">
            <input type="checkbox" checked={excludeSimilar} onChange={e => setExcludeSimilar(e.target.checked)} />
            排除相似字符 (1/l/I/0/O)
          </label>
        </div>

        <button className="btn-generate" onClick={generate}>
          生成密码
        </button>
      </div>

      {password && (
        <div className="result">
          <div className="password-display">
            <span className="password-text">{password}</span>
            <button className="btn-copy" onClick={copyToClipboard}>
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <div className="strength-bar-wrap">
            <div className="strength-bar">
              <div
                className={`strength-fill ${strength.level}`}
                style={{ width: `${(strength.score / 7) * 100}%`, background: strengthColors[strength.level] }}
              />
            </div>
            <span className="strength-label" style={{ color: strengthColors[strength.level] }}>
              {strength.label}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default App