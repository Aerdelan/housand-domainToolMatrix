import { useState } from 'react';
import './App.css'
import { useTranslation } from 'react-i18next';

type Mode = 'beautify' | 'compress' | 'json2yaml' | 'yaml2json' | 'jwt';

function App() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('beautify');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const processJSON = () => {
    setError('');
    if (!input.trim()) { setOutput(''); return; }
    try {
      if (mode === 'beautify') {
        setOutput(JSON.stringify(JSON.parse(input), null, 2));
      } else if (mode === 'compress') {
        setOutput(JSON.stringify(JSON.parse(input)));
      } else if (mode === 'json2yaml') {
        setOutput(jsonToYaml(JSON.parse(input)));
      } else if (mode === 'yaml2json') {
        setOutput(JSON.stringify(yamlToJson(input), null, 2));
      } else if (mode === 'jwt') {
        setOutput(parseJWT(input));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid input');
      setOutput('');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>JSON Formatter</h1>
        <span className="subtitle">格式化 / 校验 / JWT 解析</span>
      </header>
      <div className="mode-bar">
        {(['beautify','compress','json2yaml','yaml2json','jwt'] as Mode[]).map(m => (
          <button key={m} className={mode === m ? 'active' : ''} onClick={() => { setMode(m); setOutput(''); setError(''); }}>
            {{beautify:'美化',compress:'压缩',json2yaml:'JSON→YAML',yaml2json:'YAML→JSON',jwt:'JWT解析'}[m]}
          </button>
        ))}
      </div>
      <div className="panels">
        <div className="panel">
          <label>{mode === 'jwt' ? 'JWT Token' : '输入'}</label>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'jwt' ? 'eyJhbGci...' : '粘贴 JSON 或 YAML...'} spellCheck={false} />
        </div>
        <div className="panel">
          <label>结果</label>
          {error ? <div className="error">{error}</div> : <textarea value={output} readOnly spellCheck={false} />}
        </div>
      </div>
      <button className="convert-btn" onClick={processJSON}>转换</button>
    </div>
  );
}

function jsonToYaml(obj: any, indent = ''): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') return obj.includes(':') || obj.includes('#') ? `"${obj}"` : obj;
    return String(obj);
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map((v: any) => `${indent}- ${jsonToYaml(v, indent + '  ').replace(/^\s*/, '')}`).join('\n');
  }
  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';
  return keys.map(k => {
    const v = obj[k];
    if (v === null || typeof v !== 'object') return `${indent}${k}: ${jsonToYaml(v, indent)}`;
    if (Array.isArray(v)) {
      if (v.length === 0) return `${indent}${k}: []`;
      return `${indent}${k}:\n${jsonToYaml(v, indent + '  ')}`;
    }
    if (Object.keys(v).length === 0) return `${indent}${k}: {}`;
    return `${indent}${k}:\n${jsonToYaml(v, indent + '  ')}`;
  }).join('\n');
}

function yamlToJson(yaml: string): any {
  yaml = yaml.replace(/\r\n/g, '\n');
  const lines = yaml.split('\n');
  const root: any = {};
  const stack: { obj: any; indent: number; key?: string }[] = [{ obj: root, indent: -1 }];
  let arrContext: { arr: any[]; indent: number } | null = null;

  for (const raw of lines) {
    const line = raw;
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.search(/\S/);
    const content = line.trim();

    if (content.startsWith('- ')) {
      const val = content.slice(2).trim();
      if (!arrContext || indent <= arrContext.indent) {
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
        const parent = stack[stack.length - 1].obj;
        const k = stack[stack.length - 1].key!;
        const arr: any[] = [];
        parent[k] = arr;
        arrContext = { arr, indent };
        stack.push({ obj: arr, indent, key: undefined as any });
      }
      arrContext.arr.push(parseYamlValue(val));
    } else {
      const colonIdx = content.indexOf(':');
      if (colonIdx === -1) continue;
      const key = content.slice(0, colonIdx).trim();
      const val = content.slice(colonIdx + 1).trim();

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
        if (arrContext && indent <= arrContext.indent) arrContext = null;
      }

      const parent = stack[stack.length - 1].obj;
      if (Array.isArray(parent)) continue;

      if (val === '' || val === '|' || val === '>') {
        parent[key] = {};
        stack.push({ obj: parent[key], indent, key });
        arrContext = null;
      } else {
        parent[key] = parseYamlValue(val);
      }
    }
  }
  return root;
}

function parseYamlValue(v: string): any {
  if (v === 'null' || v === '~') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+\.?\d*$/.test(v) && v !== '') return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

function parseJWT(token: string): string {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('无效的 JWT Token');
  const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  const headerStr = JSON.stringify(header, null, 2);
  const payloadStr = JSON.stringify(payload, null, 2);
  const exp = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : '无';
  const iat = payload.iat ? new Date(payload.iat * 1000).toLocaleString() : '无';
  return `=== HEADER ===\n${headerStr}\n\n=== PAYLOAD ===\n${payloadStr}\n\n--- 时间 ---\n签发(iat): ${iat}\n过期(exp): ${exp}`;
}

export default App;