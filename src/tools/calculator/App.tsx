import { useState, useCallback } from 'react'
import './App.css'
import { useTranslation } from 'react-i18next'

type Mode = 'standard' | 'scientific'

/* ── Standard Calculator ── */
function StandardCalc() {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')

  const input = useCallback((val: string) => {
    setDisplay(prev => {
      if (prev === '0' && val !== '.') return val
      if (prev === 'Error') return val
      return prev + val
    })
  }, [])

  const clear = () => { setDisplay('0'); setExpression('') }
  const del = () => setDisplay(prev => prev.length <= 1 ? '0' : prev.slice(0, -1))

  const calc = useCallback(() => {
    try {
      let expr = display
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/%/g, '/100')
      const result = Function('"use strict"; return (' + expr + ')')()
      const formatted = typeof result === 'number' && isFinite(result)
        ? parseFloat(result.toPrecision(12)).toString()
        : 'Error'
      setExpression(display + ' =')
      setDisplay(formatted)
    } catch {
      setDisplay('Error')
    }
  }, [display])

  const buttons = [
    ['C', '⌫', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', '+'],
    ['0', '.', '(', ')'],
    ['='],
  ]

  return (
    <div className="calc-container">
      <div className="display">
        <div className="expression">{expression}</div>
        <div className="current">{display}</div>
      </div>
      <div className="keypad">
        {buttons.map((row, ri) => (
          <div key={ri} className="key-row">
            {row.map(btn => {
              let cls = 'key'
              if (btn === '=') cls += ' key-equals'
              else if (btn === 'C') cls += ' key-clear'
              else if (['÷', '×', '−', '+'].includes(btn)) cls += ' key-op'

              return (
                <button
                  key={btn}
                  className={cls}
                  onClick={() => {
                    if (btn === 'C') clear()
                    else if (btn === '⌫') del()
                    else if (btn === '=') calc()
                    else input(btn)
                  }}
                >
                  {btn}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Scientific Calculator ── */
function ScientificCalc() {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [isRad, setIsRad] = useState(true)

  const input = useCallback((val: string) => {
    setDisplay(prev => {
      if (prev === '0' && val !== '.' && !['sin(', 'cos(', 'tan(', 'log(', 'ln(', 'sqrt(', 'abs('].includes(val)) return val
      if (prev === 'Error') return val
      return prev + val
    })
  }, [])

  const clear = () => { setDisplay('0'); setExpression('') }

  const calc = useCallback(() => {
    try {
      let expr = display
        .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
        .replace(/π/g, String(Math.PI))
        .replace(/e(?=[^xp])/g, String(Math.E))

      // Replace functions
      expr = expr.replace(/sin\(/g, isRad ? 'Math.sin(' : 'Math.sin(Math.PI/180*')
      expr = expr.replace(/cos\(/g, isRad ? 'Math.cos(' : 'Math.cos(Math.PI/180*')
      expr = expr.replace(/tan\(/g, isRad ? 'Math.tan(' : 'Math.tan(Math.PI/180*')
      expr = expr.replace(/log\(/g, 'Math.log10(')
      expr = expr.replace(/ln\(/g, 'Math.log(')
      expr = expr.replace(/sqrt\(/g, 'Math.sqrt(')
      expr = expr.replace(/abs\(/g, 'Math.abs(')
      expr = expr.replace(/(\d+)!/g, (_, n) => {
        let r = 1; for (let i = 2; i <= parseInt(n); i++) r *= i; return String(r)
      })
      expr = expr.replace(/(\d+)\^(\d+)/g, 'Math.pow($1,$2)')

      const result = Function('"use strict"; return (' + expr + ')')()
      const formatted = typeof result === 'number' && isFinite(result)
        ? parseFloat(result.toPrecision(12)).toString()
        : 'Error'
      setExpression(display + ' =')
      setDisplay(formatted)
    } catch {
      setDisplay('Error')
    }
  }, [display, isRad])

  const funcButtons = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', 'sqrt(', 'abs(', 'π', 'e', '!', '^']
  const numButtons = [
    ['C', '⌫', '(', ')'],
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '−'],
    ['0', '.', '=', '+'],
  ]

  return (
    <div className="calc-container">
      <div className="display">
        <div className="expression">{expression}</div>
        <div className="current">{display}</div>
      </div>
      <div className="mode-toggle">
        <button className={isRad ? 'active' : ''} onClick={() => setIsRad(true)}>弧度 (RAD)</button>
        <button className={!isRad ? 'active' : ''} onClick={() => setIsRad(false)}>角度 (DEG)</button>
      </div>
      <div className="keypad">
        <div className="func-row">
          {funcButtons.map(btn => (
            <button key={btn} className="key key-func" onClick={() => input(btn)}>{btn}</button>
          ))}
        </div>
        {numButtons.map((row, ri) => (
          <div key={ri} className="key-row">
            {row.map(btn => {
              let cls = 'key'
              if (btn === '=') cls += ' key-equals'
              else if (btn === 'C') cls += ' key-clear'
              else if (['÷', '×', '−', '+'].includes(btn)) cls += ' key-op'
              return (
                <button key={btn} className={cls} onClick={() => {
                  if (btn === 'C') clear()
                  else if (btn === '⌫') setDisplay(prev => prev.length <= 1 ? '0' : prev.slice(0, -1))
                  else if (btn === '=') calc()
                  else input(btn)
                }}>{btn}</button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── App ── */
const modes: Mode[] = ['standard', 'scientific']
const modeLabels: Record<Mode, string> = { standard: '标准', scientific: '科学' }

function App() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('standard')

  return (
    <div className="app">
      <header className="header">
        <h1>{t('tools.calculator.title')}</h1>
        <p className="subtitle">{t('tools.calculator.desc')}</p>
      </header>

      <div className="tabs">
        {modes.map(m => (
          <button key={m} className={`tab ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
            {modeLabels[m]}
          </button>
        ))}
      </div>

      {mode === 'standard' && <StandardCalc />}
      {mode === 'scientific' && <ScientificCalc />}
    </div>
  )
}

export default App