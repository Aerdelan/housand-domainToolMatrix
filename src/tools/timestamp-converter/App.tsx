import { useState, useEffect, useCallback } from 'react';
import './App.css'
import { useTranslation } from 'react-i18next';

const TZ_OFFSETS: [string, number][] = [
  ['UTC-12', -12], ['UTC-8 (PST)', -8], ['UTC-5 (EST)', -5],
  ['UTC+0 (GMT)', 0], ['UTC+1 (CET)', 1], ['UTC+3 (MSK)', 3],
  ['UTC+5:30 (IST)', 5.5], ['UTC+8 (CST 北京)', 8], ['UTC+9 (JST)', 9],
  ['UTC+10 (AEST)', 10], ['UTC+12', 12],
];

function toUTCDateStr(ts: number, isMs: boolean): string {
  const d = new Date(isMs ? ts : ts * 1000);
  return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function tsToLocal(ts: number, isMs: boolean): string {
  const d = new Date(isMs ? ts : ts * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function tsToZone(ts: number, isMs: boolean, offset: number): string {
  const utcMs = isMs ? ts : ts * 1000;
  const d = new Date(utcMs + offset * 3600000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function App() {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  const [tsInput, setTsInput] = useState('');
  const [isMs, setIsMs] = useState(false);
  const [tsResult, setTsResult] = useState('');
  const [tsError, setTsError] = useState('');
  const [zoneTimestamp, setZoneTimestamp] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [dateResult, setDateResult] = useState('');
  const [selectedZone, setSelectedZone] = useState(8);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const convertTs = useCallback(() => {
    setTsError('');
    const v = tsInput.trim();
    if (!v) { setTsResult(''); return; }
    const n = Number(v);
    if (isNaN(n)) { setTsError('请输入有效数字'); return; }
    const ts = isMs ? n : n;
    setTsResult(`本地: ${tsToLocal(n, isMs)}\nUTC:  ${toUTCDateStr(n, isMs)}`);
    setZoneTimestamp(String(ts));
  }, [tsInput, isMs]);

  const convertDate = useCallback(() => {
    if (!dateInput) { setDateResult(''); return; }
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) { setDateResult('无效日期'); return; }
      const sec = Math.floor(d.getTime() / 1000);
      const ms = d.getTime();
      setDateResult(`秒:  ${sec}\n毫秒: ${ms}`);
    } catch { setDateResult('转换失败'); }
  }, [dateInput]);

  return (
    <div className="app">
      <header className="header"><h1>Timestamp Converter</h1><span className="subtitle">Unix 时间戳 / 日期互转</span></header>

      <div className="realtime">
        <div className="realtime-label">当前时间戳</div>
        <div className="realtime-values">
          <div><span>秒</span><code>{Math.floor(now/1000)}</code></div>
          <div><span>毫秒</span><code>{now}</code></div>
          <div><span>本地时间</span><code>{tsToLocal(now, true)}</code></div>
        </div>
      </div>

      <div className="section">
        <h3>时间戳 → 日期</h3>
        <div className="input-row">
          <input value={tsInput} onChange={e => setTsInput(e.target.value)} placeholder="输入时间戳..." className="main-input" />
          <label className="toggle"><input type="checkbox" checked={isMs} onChange={e => setIsMs(e.target.checked)} />毫秒</label>
          <button onClick={convertTs}>转换</button>
        </div>
        {tsError && <div className="error">{tsError}</div>}
        {tsResult && <pre className="result">{tsResult}</pre>}
        {zoneTimestamp && (
          <div className="zone-grid">
            <label>时区转换:</label>
            <select value={selectedZone} onChange={e => setSelectedZone(+e.target.value)}>
              {TZ_OFFSETS.map(([name, off]) => <option key={name} value={off}>{name}</option>)}
            </select>
            <code>{tsToZone(Number(zoneTimestamp), isMs, selectedZone)}</code>
          </div>
        )}
      </div>

      <div className="section">
        <h3>日期 → 时间戳</h3>
        <div className="input-row">
          <input type="datetime-local" value={dateInput} onChange={e => setDateInput(e.target.value)} className="main-input" />
          <button onClick={convertDate}>转换</button>
        </div>
        {dateResult && <pre className="result">{dateResult}</pre>}
      </div>
    </div>
  );
}

export default App;