import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { useTranslation } from 'react-i18next'

type Category = 'length' | 'area' | 'volume' | 'weight' | 'temperature' | 'speed' | 'data'

interface UnitDef {
  key: string
  label: string
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

const categories: Record<Category, { name: string; units: UnitDef[] }> = {
  length: {
    name: '长度',
    units: [
      { key: 'mm', label: '毫米 (mm)', toBase: v => v / 1000, fromBase: v => v * 1000 },
      { key: 'cm', label: '厘米 (cm)', toBase: v => v / 100, fromBase: v => v * 100 },
      { key: 'm', label: '米 (m)', toBase: v => v, fromBase: v => v },
      { key: 'km', label: '千米 (km)', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { key: 'inch', label: '英寸 (in)', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
      { key: 'ft', label: '英尺 (ft)', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
      { key: 'yard', label: '码 (yd)', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
      { key: 'mile', label: '英里 (mi)', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
    ]
  },
  area: {
    name: '面积',
    units: [
      { key: 'mm2', label: '平方毫米 (mm²)', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
      { key: 'cm2', label: '平方厘米 (cm²)', toBase: v => v / 10000, fromBase: v => v * 10000 },
      { key: 'm2', label: '平方米 (m²)', toBase: v => v, fromBase: v => v },
      { key: 'ha', label: '公顷 (ha)', toBase: v => v * 10000, fromBase: v => v / 10000 },
      { key: 'km2', label: '平方千米 (km²)', toBase: v => v * 1e6, fromBase: v => v / 1e6 },
      { key: 'acre', label: '英亩 (acre)', toBase: v => v * 4046.856, fromBase: v => v / 4046.856 },
    ]
  },
  volume: {
    name: '体积',
    units: [
      { key: 'ml', label: '毫升 (mL)', toBase: v => v / 1000, fromBase: v => v * 1000 },
      { key: 'l', label: '升 (L)', toBase: v => v, fromBase: v => v },
      { key: 'm3', label: '立方米 (m³)', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { key: 'gal', label: '美制加仑 (gal)', toBase: v => v * 3.78541, fromBase: v => v / 3.78541 },
      { key: 'qt', label: '夸脱 (qt)', toBase: v => v * 0.946353, fromBase: v => v / 0.946353 },
      { key: 'cup', label: '杯 (cup)', toBase: v => v * 0.236588, fromBase: v => v / 0.236588 },
    ]
  },
  weight: {
    name: '重量',
    units: [
      { key: 'mg', label: '毫克 (mg)', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
      { key: 'g', label: '克 (g)', toBase: v => v / 1000, fromBase: v => v * 1000 },
      { key: 'kg', label: '千克 (kg)', toBase: v => v, fromBase: v => v },
      { key: 't', label: '吨 (t)', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { key: 'lb', label: '磅 (lb)', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
      { key: 'oz', label: '盎司 (oz)', toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
    ]
  },
  temperature: {
    name: '温度',
    units: [
      { key: 'c', label: '摄氏度 (°C)', toBase: v => v, fromBase: v => v },
      { key: 'f', label: '华氏度 (°F)', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
      { key: 'k', label: '开尔文 (K)', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
    ]
  },
  speed: {
    name: '速度',
    units: [
      { key: 'ms', label: '米/秒 (m/s)', toBase: v => v, fromBase: v => v },
      { key: 'kmh', label: '千米/时 (km/h)', toBase: v => v / 3.6, fromBase: v => v * 3.6 },
      { key: 'mph', label: '英里/时 (mph)', toBase: v => v * 0.44704, fromBase: v => v / 0.44704 },
      { key: 'knot', label: '节 (kn)', toBase: v => v * 0.514444, fromBase: v => v / 0.514444 },
    ]
  },
  data: {
    name: '数据存储',
    units: [
      { key: 'b', label: '字节 (B)', toBase: v => v, fromBase: v => v },
      { key: 'kb', label: '千字节 (KB)', toBase: v => v * 1024, fromBase: v => v / 1024 },
      { key: 'mb', label: '兆字节 (MB)', toBase: v => v * 1024 ** 2, fromBase: v => v / 1024 ** 2 },
      { key: 'gb', label: '吉字节 (GB)', toBase: v => v * 1024 ** 3, fromBase: v => v / 1024 ** 3 },
      { key: 'tb', label: '太字节 (TB)', toBase: v => v * 1024 ** 4, fromBase: v => v / 1024 ** 4 },
    ]
  },
}

const tabs: Category[] = ['length', 'area', 'volume', 'weight', 'temperature', 'speed', 'data']

function App() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Category>('length')
  const [fromUnit, setFromUnit] = useState('m')
  const [toUnit, setToUnit] = useState('cm')
  const [fromVal, setFromVal] = useState('1')
  const [toVal, setToVal] = useState('')
  const [lastEdited, setLastEdited] = useState<'from' | 'to'>('from')

  const cat = categories[tab]

  useEffect(() => {
    setFromUnit(cat.units[0].key)
    setToUnit(cat.units[Math.min(1, cat.units.length - 1)].key)
    setFromVal('1')
    setToVal('')
    setLastEdited('from')
  }, [tab])

  const convert = useCallback((value: string, unitKey: string, targetKey: string): string => {
    const n = parseFloat(value)
    if (isNaN(n)) return ''
    const unit = cat.units.find(u => u.key === unitKey)
    const target = cat.units.find(u => u.key === targetKey)
    if (!unit || !target) return ''
    const base = unit.toBase(n)
    const result = target.fromBase(base)
    if (Math.abs(result) < 1e-15) return '0'
    if (Math.abs(result) >= 1e10 || (Math.abs(result) < 1e-9 && result !== 0)) {
      return result.toExponential(6)
    }
    return parseFloat(result.toPrecision(12)).toString()
  }, [cat])

  useEffect(() => {
    if (lastEdited === 'from') {
      setToVal(convert(fromVal, fromUnit, toUnit))
    } else {
      setFromVal(convert(toVal, toUnit, fromUnit))
    }
  }, [fromVal, toVal, fromUnit, toUnit, lastEdited, convert])

  return (
    <div className="app">
      <header className="header">
        <h1>{t('tools.unit-converter.title')}</h1>
        <p className="subtitle">实时双向换算 · 支持 7 大类别</p>
      </header>
      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {categories[t].name}
          </button>
        ))}
      </div>
      <div className="converter">
        <div className="input-group">
          <label>输入</label>
          <div className="input-row">
            <input
              type="number"
              value={fromVal}
              onChange={e => { setFromVal(e.target.value); setLastEdited('from') }}
              placeholder="输入数值"
            />
            <select value={fromUnit} onChange={e => { setFromUnit(e.target.value); setLastEdited('from') }}>
              {cat.units.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
            </select>
          </div>
        </div>
        <div className="swap-btn-wrap">
          <button className="swap-btn" onClick={() => {
            const tmp = fromUnit; setFromUnit(toUnit); setToUnit(tmp)
            const tmpV = fromVal; setFromVal(toVal); setToVal(tmpV)
            setLastEdited(p => p === 'from' ? 'to' : 'from')
          }}>⇅</button>
        </div>
        <div className="input-group">
          <label>输出</label>
          <div className="input-row">
            <input
              type="number"
              value={toVal}
              onChange={e => { setToVal(e.target.value); setLastEdited('to') }}
              placeholder="换算结果"
            />
            <select value={toUnit} onChange={e => { setToUnit(e.target.value); setLastEdited('from') }}>
              {cat.units.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App