import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { categories } from '../tools'
import './HomePage.css'

export default function HomePage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

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

  const totalCount = filtered.reduce((s, c) => s + c.tools.length, 0)

  return (
    <div className="home-page">
      <div className="home-search">
        <input
          type="text"
          placeholder={t('home.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <span className="home-search-count">
            {t('home.resultCount', { count: totalCount })}
          </span>
        )}
      </div>

      {filtered.map(cat => (
        <section key={cat.id} className="home-cat">
          <h2 className="home-cat-title">{t(`categories.${cat.id}`)}</h2>
          <div className="home-grid">
            {cat.tools.map(tool => (
              <div
                key={tool.id}
                className="home-card"
                onClick={() => navigate(`/tools/${tool.id}`)}
              >
                <span className="home-card-emoji">{tool.emoji}</span>
                <h3>{t(`tools.${tool.id}.title`)}</h3>
                <p>{t(`tools.${tool.id}.desc`)}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {filtered.length === 0 && (
        <div className="home-empty">
          {t('home.noResult')}
        </div>
      )}
    </div>
  )
}