import { useState, useMemo, useCallback } from 'react';
import './App.css'
import { useTranslation } from 'react-i18next';

interface RGB { r: number; g: number; b: number; }
interface HSL { h: number; s: number; l: number; }
interface HSV { h: number; s: number; v: number; }

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([a-f0-9]{3,8})$/i.exec(hex);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  if (h.length !== 6) return null;
  return { r: parseInt(h.slice(0,2), 16), g: parseInt(h.slice(2,4), 16), b: parseInt(h.slice(4,6), 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r,g,b].map(x => Math.round(x).toString(16).padStart(2,'0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  const nr = r/255, ng = g/255, nb = b/255;
  const max = Math.max(nr,ng,nb), min = Math.min(nr,ng,nb);
  const l = (max+min)/2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max-min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    if (max === nr) h = ((ng-nb)/d + (ng<nb?6:0)) * 60;
    else if (max === ng) h = ((nb-nr)/d + 2) * 60;
    else h = ((nr-ng)/d + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s*100), l: Math.round(l*100) };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const sl = s/100, ll = l/100;
  const c = (1-Math.abs(2*ll-1))*sl;
  const x = c*(1-Math.abs((h/60)%2-1));
  const m = ll - c/2;
  let [r,g,b] = [0,0,0];
  if (h<60) [r,g,b]=[c,x,0]; else if (h<120) [r,g,b]=[x,c,0]; else if (h<180) [r,g,b]=[0,c,x];
  else if (h<240) [r,g,b]=[0,x,c]; else if (h<300) [r,g,b]=[x,0,c]; else [r,g,b]=[c,0,x];
  return { r: Math.round((r+m)*255), g: Math.round((g+m)*255), b: Math.round((b+m)*255) };
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  const nr=r/255, ng=g/255, nb=b/255, max=Math.max(nr,ng,nb), min=Math.min(nr,ng,nb), d=max-min;
  let h=0, s=max===0?0:d/max, v=max;
  if (d!==0) {
    if(max===nr) h=((ng-nb)/d+(ng<nb?6:0))*60;
    else if(max===ng) h=((nb-nr)/d+2)*60;
    else h=((nr-ng)/d+4)*60;
  }
  return {h:Math.round(h), s:Math.round(s*100), v:Math.round(v*100)};
}

function hsvToRgb(h: number, s: number, v: number): RGB {
  const sv=s/100, vv=v/100, c=vv*sv, x=c*(1-Math.abs((h/60)%2-1)), m=vv-c;
  let [r,g,b]=[0,0,0];
  if(h<60)[r,g,b]=[c,x,0];else if(h<120)[r,g,b]=[x,c,0];else if(h<180)[r,g,b]=[0,c,x];
  else if(h<240)[r,g,b]=[0,x,c];else if(h<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];
  return {r:Math.round((r+m)*255),g:Math.round((g+m)*255),b:Math.round((b+m)*255)};
}

function App() {
  const { t } = useTranslation();
  const [hex, setHex] = useState('#3b82f6');
  const [rgb, setRgb] = useState({ r: 59, g: 130, b: 246 });
  const [gradAngle, setGradAngle] = useState(90);
  const [gradFrom, setGradFrom] = useState('#3b82f6');
  const [gradTo, setGradTo] = useState('#8b5cf6');

  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);
  const hsv = useMemo(() => rgbToHsv(rgb.r, rgb.g, rgb.b), [rgb]);

  const syncFromHex = useCallback((h: string) => {
    setHex(h);
    const r = hexToRgb(h);
    if (r) setRgb(r);
  }, []);

  const syncFromRgb = useCallback((r: number, g: number, b: number) => {
    const nr = Math.max(0,Math.min(255,Math.round(r)));
    const ng = Math.max(0,Math.min(255,Math.round(g)));
    const nb = Math.max(0,Math.min(255,Math.round(b)));
    setRgb({ r:nr, g:ng, b:nb });
    setHex(rgbToHex(nr, ng, nb));
  }, []);

  const palette = useMemo(() => {
    const h = hsl.h;
    return {
      complementary: (() => { const c = hslToRgb((h+180)%360, hsl.s, hsl.l); return rgbToHex(c.r, c.g, c.b); })(),
      analogous: [
        (() => { const c = hslToRgb((h+30)%360, hsl.s, hsl.l); return rgbToHex(c.r, c.g, c.b); })(),
        (() => { const c = hslToRgb((h-30+360)%360, hsl.s, hsl.l); return rgbToHex(c.r, c.g, c.b); })(),
      ],
      triadic: [
        (() => { const c = hslToRgb((h+120)%360, hsl.s, hsl.l); return rgbToHex(c.r, c.g, c.b); })(),
        (() => { const c = hslToRgb((h+240)%360, hsl.s, hsl.l); return rgbToHex(c.r, c.g, c.b); })(),
      ],
    };
  }, [hsl]);

  const gradCSS = `linear-gradient(${gradAngle}deg, ${gradFrom}, ${gradTo})`;

  return (
    <div className="app">
      <header className="header"><h1>Color Converter</h1><span className="subtitle">颜色转换 & 渐变生成</span></header>

      <div className="color-picker-row">
        <input type="color" value={hex} onChange={e => syncFromHex(e.target.value)} />
        <input className="hex-input" value={hex} onChange={e => syncFromHex(e.target.value)} placeholder="#000000" />
        <div className="color-preview" style={{ background: hex }} />
      </div>

      <div className="convert-grid">
        {[
          ['HEX', hex, hex],
          ['RGB', `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, `${rgb.r}, ${rgb.g}, ${rgb.b}`],
          ['HSL', `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, `${hsl.h}, ${hsl.s}%, ${hsl.l}%`],
          ['HSV', `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`, `${hsv.h}, ${hsv.s}%, ${hsv.v}%`],
        ].map(([label, css, raw]) => (
          <div key={label as string} className="convert-item">
            <strong>{label}</strong>
            <code>{css}</code>
            <button onClick={() => navigator.clipboard.writeText(css as string)}>复制</button>
          </div>
        ))}
      </div>

      <div className="rgb-sliders">
        {['R','G','B'].map((ch, i) => (
          <div key={ch} className="slider-row">
            <span className="slider-label" style={{color: ch==='R'?'#f85149':ch==='G'?'#3fb950':'#58a6ff'}}>{ch}</span>
            <input type="range" min={0} max={255} value={[rgb.r,rgb.g,rgb.b][i]} onChange={e => { const v=[...Object.values(rgb)]; v[i]=+e.target.value; syncFromRgb(v[0],v[1],v[2]); }} />
            <input type="number" min={0} max={255} value={[rgb.r,rgb.g,rgb.b][i]} onChange={e => { const v=[...Object.values(rgb)]; v[i]=+e.target.value||0; syncFromRgb(v[0],v[1],v[2]); }} className="num-input" />
          </div>
        ))}
      </div>

      <div className="section">
        <h3>调色板</h3>
        <div className="palette">
          <div><div className="swatch" style={{background:palette.complementary}} /><span>互补色</span><code>{palette.complementary}</code></div>
          {palette.analogous.map((c,i) => <div key={i}><div className="swatch" style={{background:c}} /><span>类似色 {i+1}</span><code>{c}</code></div>)}
          {palette.triadic.map((c,i) => <div key={i}><div className="swatch" style={{background:c}} /><span>三分色 {i+1}</span><code>{c}</code></div>)}
        </div>
      </div>

      <div className="section">
        <h3>渐变色生成器</h3>
        <div className="gradient-row">
          <input type="color" value={gradFrom} onChange={e => setGradFrom(e.target.value)} />
          <input type="number" value={gradAngle} onChange={e => setGradAngle(+e.target.value)} min={0} max={360} className="num-input" />
          <input type="color" value={gradTo} onChange={e => setGradTo(e.target.value)} />
        </div>
        <div className="gradient-preview" style={{ background: gradCSS }} />
        <div className="gradient-code-row">
          <code>{gradCSS}</code>
          <button onClick={() => navigator.clipboard.writeText(`background: ${gradCSS};`)}>复制 CSS</button>
        </div>
      </div>
    </div>
  );
}

export default App;