import { useState, useRef, useEffect, useCallback, type MouseEvent } from 'react';
import './App.css'
import { useTranslation } from 'react-i18next';

type Tool = 'pen' | 'line' | 'rect' | 'circle' | 'eraser';

interface DrawAction {
  type: Tool;
  color: string;
  lineWidth: number;
  points?: { x: number; y: number }[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

const COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#9ca3af', '#000000'];

function App() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawAction[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  const getCanvasContext = () => canvasRef.current?.getContext('2d') || null;

  // Redraw all actions
  const redraw = useCallback(() => {
    const ctx = getCanvasContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const action of actions) {
      ctx.strokeStyle = action.type === 'eraser' ? '#1e1e2e' : action.color;
      ctx.lineWidth = action.type === 'eraser' ? action.lineWidth * 3 : action.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = action.type === 'eraser' ? 'destination-out' : 'source-over';

      if (action.type === 'pen' && action.points) {
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x, action.points[i].y);
        }
        ctx.stroke();
      } else if (action.type === 'line' && action.startX !== undefined) {
        ctx.beginPath();
        ctx.moveTo(action.startX!, action.startY!);
        ctx.lineTo(action.endX!, action.endY!);
        ctx.stroke();
      } else if (action.type === 'rect' && action.startX !== undefined) {
        const w = action.endX! - action.startX!;
        const h = action.endY! - action.startY!;
        ctx.strokeRect(action.startX!, action.startY!, w, h);
      } else if (action.type === 'circle' && action.startX !== undefined) {
        const r = Math.sqrt(
          Math.pow(action.endX! - action.startX!, 2) +
          Math.pow(action.endY! - action.startY!, 2)
        );
        ctx.beginPath();
        ctx.arc(action.startX!, action.startY!, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [actions]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Resize canvas
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;

      const imageData = canvas.toDataURL();
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
      };
      img.src = imageData;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getPos = (e: MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleMouseDown = (e: MouseEvent) => {
    const pos = getPos(e);
    setIsDrawing(true);
    setStartPoint(pos);

    if (tool === 'pen') {
      setActions(prev => [...prev, { type: 'pen', color, lineWidth, points: [pos] }]);
    } else if (tool === 'eraser') {
      setActions(prev => [...prev, { type: 'eraser', color, lineWidth, points: [pos] }]);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);

    if (tool === 'pen' || tool === 'eraser') {
      setActions(prev => {
        const updated = [...prev];
        const last = { ...updated[updated.length - 1] };
        last.points = [...(last.points || []), pos];
        updated[updated.length - 1] = last;
        return updated;
      });
    } else {
      // For shapes, we need to show preview while drawing
      // We redraw with the current action being updated
      redraw();
      const ctx = getCanvasContext();
      if (!ctx) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();

      if (tool === 'line') {
        ctx.moveTo(startPoint!.x, startPoint!.y);
        ctx.lineTo(pos.x, pos.y);
      } else if (tool === 'rect') {
        ctx.strokeRect(startPoint!.x, startPoint!.y, pos.x - startPoint!.x, pos.y - startPoint!.y);
      } else if (tool === 'circle') {
        const r = Math.sqrt(Math.pow(pos.x - startPoint!.x, 2) + Math.pow(pos.y - startPoint!.y, 2));
        ctx.arc(startPoint!.x, startPoint!.y, r, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setRedoStack([]);

    if (tool !== 'pen' && tool !== 'eraser') {
      const pos = getPos(e);
      setActions(prev => [...prev, {
        type: tool,
        color,
        lineWidth,
        startX: startPoint!.x,
        startY: startPoint!.y,
        endX: pos.x,
        endY: pos.y,
      }]);
    }
    setStartPoint(null);
  };

  const handleUndo = () => {
    if (actions.length === 0) return;
    const last = actions[actions.length - 1];
    setActions(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, last]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setActions(prev => [...prev, last]);
  };

  const handleClear = () => {
    setActions([]);
    setRedoStack([]);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whiteboard.png';
    a.click();
  };

  return (
    <div className="app">
      <header className="header">
        <h1>{t('tools.whiteboard.title')}</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleUndo} disabled={actions.length === 0}>撤销</button>
          <button className="btn btn-secondary" onClick={handleRedo} disabled={redoStack.length === 0}>重做</button>
          <button className="btn btn-secondary" onClick={handleClear}>清空</button>
          <button className="btn btn-primary" onClick={handleExport}>导出 PNG</button>
        </div>
      </header>

      <div className="toolbar">
        <button className={`toolbar-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')} title="画笔">
          ✏️
        </button>
        <button className={`toolbar-btn ${tool === 'line' ? 'active' : ''}`} onClick={() => setTool('line')} title="直线">
          📏
        </button>
        <button className={`toolbar-btn ${tool === 'rect' ? 'active' : ''}`} onClick={() => setTool('rect')} title="矩形">
          🔲
        </button>
        <button className={`toolbar-btn ${tool === 'circle' ? 'active' : ''}`} onClick={() => setTool('circle')} title="圆形">
          ⭕
        </button>
        <button className={`toolbar-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="橡皮擦">
          🧹
        </button>

        <div className="toolbar-separator" />

        <div className="color-picker">
          {COLORS.map(c => (
            <button
              key={c}
              className={`color-swatch ${color === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        <div className="toolbar-separator" />

        <div className="stroke-width">
          <label>笔触: {lineWidth}px</label>
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={e => setLineWidth(parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          className="draw-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}

export default App;