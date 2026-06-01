import { useState, useMemo, Suspense, lazy } from 'react'
import { Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { categories } from './tools'

// ========== Lazy-loaded tool components ==========
const toolComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  'react-image': lazy(() => import('./tools/react-image/App')),
  'json-formatter': lazy(() => import('./tools/json-formatter/App')),
  'regex-tester': lazy(() => import('./tools/regex-tester/App')),
  'color-converter': lazy(() => import('./tools/color-converter/App')),
  'base64-tool': lazy(() => import('./tools/base64-tool/App')),
  'timestamp-converter': lazy(() => import('./tools/timestamp-converter/App')),
  'unit-converter': lazy(() => import('./tools/unit-converter/App')),
  'password-generator': lazy(() => import('./tools/password-generator/App')),
  'todo-list': lazy(() => import('./tools/todo-list/App')),
  'calculator': lazy(() => import('./tools/calculator/App')),
  'qr-generator': lazy(() => import('./tools/qr-generator/App')),
  'pdf-toolbox': lazy(() => import('./tools/pdf-toolbox/App')),
  'markdown-editor': lazy(() => import('./tools/markdown-editor/App')),
  'mind-map': lazy(() => import('./tools/mind-map/App')),
  'whiteboard': lazy(() => import('./tools/whiteboard/App')),
  'screen-recorder': lazy(() => import('./tools/screen-recorder/App')),
  'gif-maker': lazy(() => import('./tools/gif-maker/App')),
  'audio-editor': lazy(() => import('./tools/audio-editor/App')),
  'video-cutter': lazy(() => import('./tools/video-cutter/App')),
  'watermark-tool': lazy(() => import('./tools/watermark-tool/App')),
  'meme-generator': lazy(() => import('./tools/meme-generator/App')),
  'grid-slicer': lazy(() => import('./tools/grid-slicer/App')),
  'pixel-painter': lazy(() => import('./tools/pixel-painter/App')),
  'poster-designer': lazy(() => import('./tools/poster-designer/App')),
}

const CAT_COLORS: Record<string, string> = {
  '图片媒体': '#e17055',
  '音视频': '#00cec9',
  '文档办公': '#fdcb6e',
  '开发辅助': '#6c5ce7',
  '效率工具': '#55efc4',
}

const totalTools = categories.reduce((sum, c) => sum + c.tools.length, 0)

// ========== Sidebar ==========
function Sidebar({
  search,
  setSearch,
  activeToolId,
}: {
  search: string
  setSearch: (v: string) => void
  activeToolId: string | null
}) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories
      .map((cat) => ({
        ...cat,
        tools: cat.tools.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.tools.length > 0)
  }, [search])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo" onClick={() => setSearch('')}>
          <span className="sidebar-logo-icon">&#9632;</span>
          <span className="sidebar-logo-text">ToolHub</span>
        </Link>
      </div>

      <div className="sidebar-search">
        <input
          className="sidebar-search-input"
          type="text"
          placeholder="搜索工具..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="sidebar-search-clear" onClick={() => setSearch('')}>
            &times;
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {filtered.length === 0 && (
          <div className="sidebar-empty">未找到匹配工具</div>
        )}
        {filtered.map((cat) => {
          const isCollapsed = collapsedCategories.has(cat.id)
          return (
            <div key={cat.id} className="sidebar-category">
              <button
                className="sidebar-cat-header"
                onClick={() => toggleCategory(cat.id)}
              >
                <span
                  className="sidebar-cat-dot"
                  style={{ background: CAT_COLORS[cat.id] || '#6c5ce7' }}
                />
                <span className="sidebar-cat-name">{cat.name}</span>
                <span className="sidebar-cat-count">{cat.tools.length}</span>
                <span className={`sidebar-cat-arrow ${isCollapsed ? 'collapsed' : ''}`}>
                  &#9660;
                </span>
              </button>
              {!isCollapsed && (
                <div className="sidebar-tools">
                  {cat.tools.map((tool) => (
                    <Link
                      key={tool.id}
                      to={`/tools/${tool.id}`}
                      className={`sidebar-tool-item ${activeToolId === tool.id ? 'active' : ''}`}
                      onClick={() => setSearch('')}
                    >
                      <span className="sidebar-tool-emoji">{tool.emoji}</span>
                      <span className="sidebar-tool-name">{tool.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-version">v1.0.0 &middot; {totalTools} 工具</span>
      </div>
    </aside>
  )
}

// ========== Home Page ==========
function Home() {
  return (
    <div className="content-home">
      <div className="home-header">
        <h1 className="home-title">工具矩阵</h1>
        <p className="home-subtitle">共 {totalTools} 款在线工具，一站式提升工作效率</p>
      </div>
      <div className="home-grid-wrapper">
        {categories.map((cat) => (
          <section key={cat.id} className="home-category">
            <div className="home-cat-header">
              <span
                className="home-cat-dot"
                style={{ background: CAT_COLORS[cat.id] || '#6c5ce7' }}
              />
              <h2 className="home-cat-name">{cat.name}</h2>
              <span className="home-cat-count">{cat.tools.length}</span>
            </div>
            <div className="home-grid">
              {cat.tools.map((tool) => (
                <Link
                  key={tool.id}
                  to={`/tools/${tool.id}`}
                  className="home-card"
                >
                  <span className="home-card-emoji">{tool.emoji}</span>
                  <div className="home-card-body">
                    <h3 className="home-card-name">{tool.name}</h3>
                    <p className="home-card-desc">{tool.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

// ========== Tool Page ==========
function ToolPage({ toolId }: { toolId: string }) {
  const Tool = toolComponents[toolId]
  const navigate = useNavigate()
  const toolInfo = useMemo(
    () => categories.flatMap((c) => c.tools).find((t) => t.id === toolId),
    [toolId],
  )
  const categoryInfo = useMemo(
    () => (toolInfo ? categories.find((c) => c.id === toolInfo.category) : null),
    [toolInfo],
  )

  if (!Tool) {
    return (
      <div className="content-tool">
        <div className="tool-not-found">
          <p>工具 &ldquo;{toolId}&rdquo; 未找到</p>
          <button className="btn-back" onClick={() => navigate('/')}>
            &larr; 返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="content-tool">
      <div className="tool-toolbar">
        <button className="btn-back" onClick={() => navigate('/')}>
          &larr; 返回首页
        </button>
        {toolInfo && categoryInfo && (
          <div className="tool-breadcrumb">
            <span className="breadcrumb-cat">{categoryInfo.name}</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-tool">{toolInfo.name}</span>
          </div>
        )}
      </div>
      <div className="tool-content">
        <Suspense fallback={<div className="tool-loading">加载中...</div>}>
          <Tool />
        </Suspense>
      </div>
    </div>
  )
}

// ========== App Root ==========
export default function App() {
  const [search, setSearch] = useState('')
  const location = useLocation()

  const activeToolId = useMemo(() => {
    const match = location.pathname.match(/^\/tools\/(.+)$/)
    return match ? match[1] : null
  }, [location.pathname])

  return (
    <div className="app-layout">
      <Sidebar
        search={search}
        setSearch={setSearch}
        activeToolId={activeToolId}
      />
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools/:toolId" element={<ToolRoute />} />
        </Routes>
      </main>
    </div>
  )
}

function ToolRoute() {
  const { toolId } = useParams<{ toolId: string }>()
  return <ToolPage toolId={toolId || ''} />
}