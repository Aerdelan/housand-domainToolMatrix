import { Suspense, lazy } from 'react'
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './components/Sidebar'
import HomePage from './components/HomePage'
import { categories } from './tools'
import './App.css'

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
  'xlsx-to-sql': lazy(() => import('./tools/xlsx-to-sql/App')),
}

// ========== Tool Page Wrapper ==========
function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const id = toolId || ''
  const Tool = toolComponents[id]

  // Resolve tool display name
  let toolName = t(`tools.${id}.title`, '')
  if (!toolName) toolName = id
  let toolCat = ''
  for (const cat of categories) {
    const found = cat.tools.find(tool => tool.id === id)
    if (found) {
      toolCat = t(`categories.${cat.id}`)
      break
    }
  }

  if (!Tool) {
    return (
      <div className="not-found">
        <p>{t('app.notFound')} "{id}"</p>
        <button onClick={() => navigate('/')}>{t('app.back')}</button>
      </div>
    )
  }

  return (
    <div className="tool-page">
      <div className="tool-topbar">
        <button className="back-btn" onClick={() => navigate('/')}>
          {t('app.back')}
        </button>
        <div className="breadcrumb">
          <span className="breadcrumb-dim">{toolCat}</span>
          <span className="breadcrumb-sep">/</span>
          <span>{toolName}</span>
        </div>
      </div>
      <div className="tool-content">
        <Suspense fallback={<div className="loading">{t('app.loading')}</div>}>
          <Tool />
        </Suspense>
      </div>
    </div>
  )
}

// ========== App Root ==========
export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tools/:toolId" element={<ToolPage />} />
        </Routes>
      </main>
    </div>
  )
}