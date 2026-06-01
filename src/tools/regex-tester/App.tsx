import { useState } from 'react';
import './App.css'
import { useTranslation } from 'react-i18next';

const PRESETS: [string, string, string][] = [
  ['邮箱', '\\w[\\w.]*@\\w+\\.[a-zA-Z]{2,}', 'test@example.com user@mail.co'],
  ['手机号', '1[3-9]\\d{9}', '13800138000 12345678901'],
  ['URL', 'https?://[\\w./-]+', 'Visit https://www.example.com/path now'],
  ['IPv4', '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}', '192.168.1.1 256.0.0.1'],
  ['身份证', '\\d{17}[\\dXx]', '110101199001011234'],
  ['日期', '\\d{4}-\\d{2}-\\d{2}', '2024-01-15 2024-12-31'],
  ['十六进制色值', '#[0-9a-fA-F]{6}', 'color: #ff5733; background: #00ff00'],
  ['中文', '[\\u4e00-\\u9fa5]+', 'Hello 世界 你好'],
];

function App() {
  const { t } = useTranslation();
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('');
  const [highlighted, setHighlighted] = useState('');
  const [matches, setMatches] = useState<string[][]>([]);
  const [error, setError] = useState('');

  const testRegex = (p: string, f: string, t: string) => {
    setError('');
    if (!p) { setMatches([]); setHighlighted(''); return; }
    try {
      const re = new RegExp(p, f);
      const results: string[][] = [];
      let m: RegExpExecArray | null;
      if (f.includes('g')) {
        while ((m = re.exec(t)) !== null) {
          results.push(Array.from(m));
          if (m[0] === '') { re.lastIndex++; if (re.lastIndex > t.length) break; }
        }
      } else {
        m = re.exec(t);
        if (m) results.push(Array.from(m));
      }
      setMatches(results);
      let hl = t;
      try {
        const reHl = new RegExp(p, f.replace('g','') + 'g');
        hl = t.replace(reHl, '<mark>$&</mark>');
      } catch {}
      setHighlighted(hl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid regex');
      setMatches([]);
      setHighlighted('');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Regex Tester</h1>
        <span className="subtitle">正则表达式测试器</span>
      </header>

      <div className="regex-input-row">
        <span className="delimiter">/</span>
        <input className="pattern-input" value={pattern} onChange={e => { setPattern(e.target.value); testRegex(e.target.value, flags, text); }} placeholder="输入正则表达式" spellCheck={false} />
        <span className="delimiter">/</span>
        <div className="flags">
          {['g','i','m','s','u'].map(f => (
            <label key={f}><input type="checkbox" checked={flags.includes(f)} onChange={() => { const nf = flags.includes(f) ? flags.replace(f,'') : flags+f; setFlags(nf); testRegex(pattern, nf, text); }} />{f}</label>
          ))}
        </div>
      </div>

      <div className="presets">
        {PRESETS.map(([name, re, sample]) => (
          <button key={name} onClick={() => { setPattern(re); setFlags('g'); setText(sample); testRegex(re, 'g', sample); }}>{name}</button>
        ))}
      </div>

      <div className="panels">
        <div className="panel">
          <label>测试文本</label>
          <textarea value={text} onChange={e => { setText(e.target.value); testRegex(pattern, flags, e.target.value); }} placeholder="输入测试文本..." spellCheck={false} />
        </div>
        <div className="panel">
          <label>匹配高亮</label>
          {error ? <div className="error">{error}</div> : <div className="highlight-box" dangerouslySetInnerHTML={{ __html: highlighted || '无匹配' }} />}
        </div>
      </div>

      {matches.length > 0 && (
        <div className="results">
          <h3>捕获分组 ({matches.length} 个匹配)</h3>
          <table>
            <thead><tr><th>#</th><th>完整匹配</th>{matches[0].length > 1 && Array.from({length: matches[0].length-1}, (_,i) => <th key={i}>${i+1}</th>)}</tr></thead>
            <tbody>
              {matches.map((m, i) => <tr key={i}><td>{i+1}</td>{m.map((g, j) => <td key={j} className={j===0 ? 'full-match' : ''}>{g || '(空)'}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;