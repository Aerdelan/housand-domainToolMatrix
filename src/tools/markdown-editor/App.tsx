import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css'
import { useTranslation } from 'react-i18next';

function App() {
  const { t } = useTranslation();
  const [markdown, setMarkdown] = useState(`# 欢迎使用 Markdown 编辑器

## 功能特性

- **实时预览**：左侧编辑，右侧即时渲染
- **GitHub Flavored Markdown** 支持
- 快捷工具栏辅助输入
- 导出为 **HTML** 文件
- 全屏编辑模式

## 代码示例

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

## 表格

| 功能 | 状态 |
|------|------|
| 标题 | ✅ |
| 粗体/斜体 | ✅ |
| 链接/图片 | ✅ |
| 代码块 | ✅ |
| 表格 | ✅ |

> 提示：点击工具栏按钮可快速插入 Markdown 语法。
`);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ start: 0, end: 0 });
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        insertMarkdown('**', '**', '粗体文字');
      }
      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        insertMarkdown('*', '*', '斜体文字');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, cursorPos, markdown]);

  const updateCursor = () => {
    const el = editorRef.current;
    if (el) {
      setCursorPos({ start: el.selectionStart, end: el.selectionEnd });
    }
  };

  const insertMarkdown = (before: string, after: string, placeholder: string = '') => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const text = selectedText || placeholder;
    const newText = markdown.substring(0, start) + before + text + after + markdown.substring(end);
    setMarkdown(newText);
    setTimeout(() => {
      el.focus();
      const newPos = selectedText ? start + before.length + selectedText.length + after.length : start + before.length + text.length;
      el.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const toolbarButtons = [
    { label: 'H1', title: '一级标题', action: () => insertMarkdown('# ', '') },
    { label: 'H2', title: '二级标题', action: () => insertMarkdown('## ', '') },
    { label: 'H3', title: '三级标题', action: () => insertMarkdown('### ', '') },
    { label: 'B', title: '粗体 (Ctrl+B)', action: () => insertMarkdown('**', '**', '粗体') },
    { label: 'I', title: '斜体 (Ctrl+I)', action: () => insertMarkdown('*', '*', '斜体') },
    { label: '🔗', title: '链接', action: () => insertMarkdown('[', '](url)', '链接文字') },
    { label: '🖼', title: '图片', action: () => insertMarkdown('![', '](url)', '图片描述') },
    { label: '<>', title: '代码块', action: () => insertMarkdown('\n```\n', '\n```\n', '代码') },
    { label: '📋', title: '表格', action: () => insertMarkdown('\n| 列1 | 列2 |\n|-----|-----|\n| ', ' | ', '内容') },
    { label: '•', title: '无序列表', action: () => insertMarkdown('- ', '') },
    { label: '1.', title: '有序列表', action: () => insertMarkdown('1. ', '') },
    { label: '▸', title: '引用', action: () => insertMarkdown('> ', '') },
    { label: '―', title: '分割线', action: () => insertMarkdown('\n---\n', '') },
  ];

  const handleExportHtml = () => {
    // Use a simple approach: wrap the rendered HTML
    const previewEl = document.querySelector('.preview-content');
    if (!previewEl) return;
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background: #1a1a2e;
      color: #e5e7eb;
      line-height: 1.8;
    }
    pre { background: #374151; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { background: #374151; padding: 2px 6px; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #4b5563; padding: 8px 12px; text-align: left; }
    th { background: #374151; }
    a { color: #3b82f6; }
    blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; color: #9ca3af; }
    h1, h2, h3 { border-bottom: 1px solid #374151; padding-bottom: 8px; }
  </style>
</head>
<body>
${previewEl.innerHTML}
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'markdown-export.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`app ${isFullscreen ? 'fullscreen' : ''}`}>
      <header className="header">
        <h1>{t('tools.markdown-editor.title')}</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? '退出全屏' : '全屏编辑'}
          </button>
          <button className="btn btn-primary" onClick={handleExportHtml}>
            导出 HTML
          </button>
        </div>
      </header>

      <div className={`toolbar ${isFullscreen ? 'fullscreen-toolbar' : ''}`}>
        {toolbarButtons.map((btn, i) => (
          <button key={i} className="toolbar-btn" title={btn.title} onClick={btn.action}>
            {btn.label}
          </button>
        ))}
      </div>

      <div className="editor-container">
        <div className="pane pane-editor">
          <div className="pane-header">编辑区</div>
          <textarea
            ref={editorRef}
            className="editor-textarea"
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            onKeyUp={updateCursor}
            onClick={updateCursor}
            placeholder="在此输入 Markdown ..."
          />
        </div>
        <div className="pane pane-preview">
          <div className="pane-header">预览区</div>
          <div className="preview-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;