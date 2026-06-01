import { useState, useRef, useCallback } from 'react';
import './App.css'
import { useTranslation } from 'react-i18next';

interface MindNode {
  id: string;
  text: string;
  children: MindNode[];
  collapsed: boolean;
  x: number;
  y: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];

function App() {
  const { t } = useTranslation();
  const nodeCounterRef = useRef(0);
  const genId = () => `node_${++nodeCounterRef.current}`;

  const [root, setRoot] = useState<MindNode>({
    id: 'root',
    text: '中心主题',
    children: [
      { id: genId(), text: '子主题 1', children: [], collapsed: false, x: 0, y: 0 },
      { id: genId(), text: '子主题 2', children: [
        { id: genId(), text: '子主题 2.1', children: [], collapsed: false, x: 0, y: 0 },
        { id: genId(), text: '子主题 2.2', children: [], collapsed: false, x: 0, y: 0 },
      ], collapsed: false, x: 0, y: 0 },
      { id: genId(), text: '子主题 3', children: [], collapsed: false, x: 0, y: 0 },
    ],
    collapsed: false,
    x: 0,
    y: 0,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  // Layout calculation
  const NODE_W = 120;
  const NODE_H = 36;
  const H_GAP = 160;
  const V_GAP = 50;

  const computeLayout = (node: MindNode, depth: number, yOffset: { value: number }): { x: number; y: number } => {
    const x = depth * H_GAP;
    if (node.children.length === 0 || node.collapsed) {
      const y = yOffset.value;
      yOffset.value += V_GAP;
      return { x, y };
    }

    const childYs: number[] = [];
    for (const child of node.children) {
      const pos = computeLayout(child, depth + 1, yOffset);
      childYs.push(pos.y);
    }
    const y = (childYs[0] + childYs[childYs.length - 1]) / 2;
    return { x, y };
  };

  const layout = useCallback(() => {
    const offset = { value: 80 };
    return computeLayout(root, 0, offset);
  }, [root]);

  const rootPos = layout();

  const findNode = (node: MindNode, id: string): MindNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  };

  const updateNode = (node: MindNode, id: string, updater: (n: MindNode) => MindNode): MindNode => {
    if (node.id === id) return updater({ ...node });
    return { ...node, children: node.children.map(c => updateNode(c, id, updater)) };
  };

  const addChild = (parentId: string) => {
    setRoot(prev => updateNode(prev, parentId, n => ({
      ...n,
      collapsed: false,
      children: [...n.children, { id: genId(), text: '新节点', children: [], collapsed: false, x: 0, y: 0 }],
    })));
  };

  const addSibling = (nodeId: string) => {
    if (nodeId === 'root') return;
    setRoot(prev => {
      // Find parent and insert sibling
      const findParentAndInsert = (node: MindNode): MindNode => {
        const childIdx = node.children.findIndex(c => c.id === nodeId);
        if (childIdx !== -1) {
          const newNode: MindNode = { id: genId(), text: '新节点', children: [], collapsed: false, x: 0, y: 0 };
          const newChildren = [...node.children];
          newChildren.splice(childIdx + 1, 0, newNode);
          return { ...node, children: newChildren };
        }
        return { ...node, children: node.children.map(findParentAndInsert) };
      };
      return findParentAndInsert(prev);
    });
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === 'root') return;
    setRoot(prev => {
      const remove = (node: MindNode): MindNode => ({
        ...node,
        children: node.children.filter(c => c.id !== nodeId).map(remove),
      });
      return remove(prev);
    });
    setSelectedId(null);
  };

  const toggleCollapse = (nodeId: string) => {
    setRoot(prev => updateNode(prev, nodeId, n => ({ ...n, collapsed: !n.collapsed })));
  };

  const startEdit = (nodeId: string) => {
    const node = findNode(root, nodeId);
    if (node) {
      setEditingId(nodeId);
      setEditText(node.text);
    }
  };

  const finishEdit = () => {
    if (editingId) {
      setRoot(prev => updateNode(prev, editingId, n => ({ ...n, text: editText || '未命名' })));
      setEditingId(null);
    }
  };

  // Export PNG
  const exportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const bbox = svg.getBBox();
    canvas.width = bbox.width + 100;
    canvas.height = bbox.height + 100;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 50, 50);
      canvas.toBlob(b => {
        if (b) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = 'mindmap.png';
          a.click();
        }
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Export SVG
  const exportSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindmap.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render nodes recursively
  const renderNodes = (node: MindNode, depth: number, allNodes: { node: MindNode; depth: number; color: string }[]): void => {
    const color = depth === 0 ? '#3b82f6' : COLORS[depth % COLORS.length];
    allNodes.push({ node, depth, color });
    if (!node.collapsed) {
      for (const child of node.children) {
        renderNodes(child, depth + 1, allNodes);
      }
    }
  };

  const allNodes: { node: MindNode; depth: number; color: string }[] = [];
  renderNodes(root, 0, allNodes);

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { node } of allNodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y - NODE_H / 2);
    maxX = Math.max(maxX, node.x + NODE_W);
    maxY = Math.max(maxY, node.y + NODE_H / 2);
  }

  const svgW = Math.max(800, maxX - minX + 200);
  const svgH = Math.max(600, maxY - minY + 200);

  return (
    <div className="app">
      <header className="header">
        <h1>{t('tools.mind-map.title')}</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => selectedId && addChild(selectedId)}>添加子节点</button>
          <button className="btn btn-secondary" onClick={() => selectedId && addSibling(selectedId)}>添加同级</button>
          <button className="btn btn-secondary" onClick={() => selectedId && toggleCollapse(selectedId)}>折叠/展开</button>
          <button className="btn btn-danger" onClick={() => selectedId && deleteNode(selectedId)}>删除</button>
          <button className="btn btn-secondary" onClick={exportPng}>导出 PNG</button>
          <button className="btn btn-secondary" onClick={exportSvg}>导出 SVG</button>
        </div>
      </header>

      <div className="mindmap-container">
        <svg
          ref={svgRef}
          viewBox={`${minX - 80} ${minY - 60} ${maxX - minX + 160} ${maxY - minY + 120}`}
          className="mindmap-svg"
        >
          {/* Render lines first */}
          {allNodes.map(({ node }) => (
            !node.collapsed && node.children.map(child => (
              <line
                key={`line-${node.id}-${child.id}`}
                x1={node.x + NODE_W}
                y1={node.y}
                x2={child.x}
                y2={child.y}
                stroke="#4b5563"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))
          ))}

          {/* Render nodes */}
          {allNodes.map(({ node, depth, color }) => (
            <g
              key={node.id}
              className={`mind-node ${selectedId === node.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(node.id)}
              onDoubleClick={() => startEdit(node.id)}
            >
              <rect
                x={node.x}
                y={node.y - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx="8"
                fill={color}
                opacity={selectedId === node.id ? 1 : 0.85}
                stroke={selectedId === node.id ? '#fff' : 'transparent'}
                strokeWidth="2"
              />
              {editingId === node.id ? (
                <foreignObject x={node.x + 4} y={node.y - NODE_H / 2 + 4} width={NODE_W - 8} height={NODE_H - 8}>
                  <input
                    className="node-edit-input"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onBlur={finishEdit}
                    onKeyDown={e => e.key === 'Enter' && finishEdit()}
                    autoFocus
                    style={{ width: '100%', height: '100%', border: 'none', color: '#fff', textAlign: 'center', fontSize: '13px', outline: 'none' }}
                  />
                </foreignObject>
              ) : (
                <text
                  x={node.x + NODE_W / 2}
                  y={node.y + 5}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="13"
                  fontWeight={depth === 0 ? 'bold' : 'normal'}
                  pointerEvents="none"
                >
                  {node.text.length > 10 ? node.text.substring(0, 10) + '…' : node.text}
                </text>
              )}
              {node.collapsed && node.children.length > 0 && (
                <text x={node.x + NODE_W + 8} y={node.y + 5} fill="#f59e0b" fontSize="16" fontWeight="bold">+{node.children.length}</text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default App;