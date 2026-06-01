import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { categories } from '../tools'
import './Sidebar.css'

export default function Sidebar() {
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState('')
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const navigate = useNavigate()
  const location = useLocation()

  const toggleLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(next)
  }

  const toggleCat = (catId: string) => {
    setCollapsedCats(prev => {
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
      .map(cat => ({
        ...cat,
        tools: cat.tools.filter(
          tool => {
            const name = t(`tools.${tool.id}.title`)
            const desc = t(`tools.${tool.id}.desc`)
            return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q)
          }
        ),
      }))
      .filter(cat => cat.tools.length > 0)
  }, [search, t])

  const currentToolId = location.pathname.startsWith('/tools/')
    ? location.pathname.replace('/tools/', '')
    : null

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">ToolHub</div>

      <div className="sidebar-search">
        <input
          type="text"
          placeholder={t('sidebar.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <nav className="sidebar-nav">
        {filtered.map(cat => {
          const collapsed = collapsedCats.has(cat.id)
          return (
            <div key={cat.id} className="sidebar-cat">
              <div
                className="sidebar-cat-header"
                onClick={() => toggleCat(cat.id)}
              >
                <span className="cat-arrow">
                  {collapsed ? '\u25B8' : '\u25BE'}
                </span>
                <span className="cat-name">{t(`categories.${cat.id}`)}</span>
                <span className="cat-count">{cat.tools.length}</span>
              </div>
              {!collapsed && (
                <div className="sidebar-tools">
                  {cat.tools.map(tool => (
                    <div
                      key={tool.id}
                      className={`sidebar-tool${currentToolId === tool.id ? ' active' : ''}`}
                      onClick={() => navigate(`/tools/${tool.id}`)}
                    >
                      <span className="tool-emoji">{tool.emoji}</span>
                      <span className="tool-name">{t(`tools.${tool.id}.title`)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="lang-toggle" onClick={toggleLang} title="Switch language">
          {t('sidebar.langSwitch')}
        </button>
        <span className="version">{t('sidebar.version')}</span>
      </div>
    </aside>
  )
}