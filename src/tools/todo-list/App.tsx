import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { useTranslation } from 'react-i18next'

type Priority = 'low' | 'medium' | 'high'

interface Todo {
  id: string
  text: string
  completed: boolean
  priority: Priority
  createdAt: number
}

const priorityLabels: Record<Priority, string> = { low: '低', medium: '中', high: '高' }

type Filter = 'all' | 'active' | 'completed'

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem('todo-list-data')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTodos(todos: Todo[]) {
  localStorage.setItem('todo-list-data', JSON.stringify(todos))
}

function App() {
  const { t } = useTranslation();
  const [todos, setTodos] = useState<Todo[]>(loadTodos)
  const [input, setInput] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [filter, setFilter] = useState<Filter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => { saveTodos(todos) }, [todos])

  const addTodo = useCallback(() => {
    const text = input.trim()
    if (!text) return
    setTodos(prev => [...prev, {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text,
      completed: false,
      priority,
      createdAt: Date.now()
    }])
    setInput('')
  }, [input, priority])

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }, [])

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }, [])

  const startEdit = useCallback((todo: Todo) => {
    setEditingId(todo.id)
    setEditText(todo.text)
  }, [])

  const saveEdit = useCallback(() => {
    if (editingId && editText.trim()) {
      setTodos(prev => prev.map(t => t.id === editingId ? { ...t, text: editText.trim() } : t))
    }
    setEditingId(null)
    setEditText('')
  }, [editingId, editText])

  const clearCompleted = useCallback(() => {
    setTodos(prev => prev.filter(t => !t.completed))
  }, [])

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  const activeCount = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  return (
    <div className="app">
      <header className="header">
        <h1>{t('tools.todo-list.title')}</h1>
        <p className="subtitle">{activeCount} 项待完成 · {completedCount} 项已完成</p>
      </header>

      <div className="add-bar">
        <input
          className="add-input"
          placeholder="添加新任务..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
        />
        <select className="priority-select" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
          <option value="low">低优先级</option>
          <option value="medium">中优先级</option>
          <option value="high">高优先级</option>
        </select>
        <button className="btn-add" onClick={addTodo}>添加</button>
      </div>

      <div className="filters">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          全部 ({todos.length})
        </button>
        <button className={`filter-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>
          进行中 ({activeCount})
        </button>
        <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
          已完成 ({completedCount})
        </button>
        {completedCount > 0 && (
          <button className="btn-clear" onClick={clearCompleted}>清空已完成</button>
        )}
      </div>

      <ul className="todo-list">
        {filtered.map(todo => (
          <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
            <button
              className={`check-circle ${todo.completed ? 'checked' : ''}`}
              onClick={() => toggleTodo(todo.id)}
            >
              {todo.completed ? '✓' : ''}
            </button>

            {editingId === todo.id ? (
              <input
                className="edit-input"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                onBlur={saveEdit}
                autoFocus
              />
            ) : (
              <span className="todo-text" onDoubleClick={() => !todo.completed && startEdit(todo)}>
                {todo.text}
              </span>
            )}

            <span className={`priority-badge priority-${todo.priority}`}>
              {priorityLabels[todo.priority]}
            </span>

            <div className="todo-actions">
              {!todo.completed && editingId !== todo.id && (
                <button className="action-btn" onClick={() => startEdit(todo)} title="编辑">✎</button>
              )}
              <button className="action-btn danger" onClick={() => deleteTodo(todo.id)} title="删除">✕</button>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="empty-msg">
            {filter === 'all' ? '暂无任务，添加一个吧' : filter === 'active' ? '没有进行中的任务' : '没有已完成的任务'}
          </li>
        )}
      </ul>
    </div>
  )
}

export default App