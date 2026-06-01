import { useState, useCallback, useMemo, type ChangeEvent, type DragEvent } from 'react';
import * as XLSX from 'xlsx';
import './App.css'
import { useTranslation } from 'react-i18next';

type Dialect = 'mysql' | 'postgresql' | 'sqlite';

interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
}

function detectColumnType(values: string[]): string {
  const nonEmpty = values.filter(v => v !== '');
  if (nonEmpty.length === 0) return 'TEXT';
  const allInt = nonEmpty.every(v => /^-?\d+$/.test(v));
  if (allInt) return 'INTEGER';
  const allNum = nonEmpty.every(v => /^-?\d+(\.\d+)?$/.test(v));
  if (allNum) return 'REAL';
  return 'TEXT';
}

function escapeSQL(value: string, dialect: Dialect): string {
  if (value === '') return 'NULL';
  const escaped = value.replace(/'/g, "''").replace(/\\/g, '\\\\');
  return `'${escaped}'`;
}

function generateCreateTable(tableName: string, headers: string[], rows: string[][], dialect: Dialect): string {
  const lines: string[] = [];
  const colDefs = headers.map((h, i) => {
    const colName = h || `col_${i + 1}`;
    const safeName = dialect === 'mysql' ? `\`${colName}\`` : colName.includes(' ') || /^\d/.test(colName) ? `"${colName}"` : colName;
    const colValues = rows.map(r => r[i] ?? '');
    const colType = detectColumnType(colValues);

    let sqlType = colType;
    if (dialect === 'postgresql') {
      sqlType = colType === 'INTEGER' ? 'INTEGER' : colType === 'REAL' ? 'NUMERIC' : 'TEXT';
    } else if (dialect === 'sqlite') {
      sqlType = colType;
    }

    return `  ${safeName} ${sqlType}`;
  });

  const pkCol = headers[0] ? (dialect === 'mysql' ? `\`${headers[0]}\`` : `"${headers[0]}"`) : '"col_1"';

  lines.push(`CREATE TABLE ${dialect === 'mysql' ? `\`${tableName}\`` : `"${tableName}"`} (`);
  lines.push(colDefs.join(',\n'));
  if (dialect === 'mysql') {
    lines.push(`,\n  PRIMARY KEY (${pkCol})`);
  }
  lines.push('\n);');

  return lines.join('');
}

function generateInserts(tableName: string, headers: string[], rows: string[][], dialect: Dialect): string {
  if (rows.length === 0) return `-- No data rows`;

  const colNames = headers.map((h, i) => {
    const name = h || `col_${i + 1}`;
    return dialect === 'mysql' ? `\`${name}\`` : `"${name}"`;
  }).join(', ');

  const safeTable = dialect === 'mysql' ? `\`${tableName}\`` : `"${tableName}"`;

  const valueRows = rows.map(row => {
    const vals = headers.map((_, i) => escapeSQL(row[i] ?? '', dialect));
    return `  (${vals.join(', ')})`;
  });

  if (dialect === 'postgresql' || dialect === 'sqlite') {
    return `INSERT INTO ${safeTable} (${colNames})\nVALUES\n${valueRows.join(',\n')};`;
  }
  // MySQL: one statement per row for safety with large datasets
  return valueRows.map(vr => `INSERT INTO ${safeTable} (${colNames}) VALUES\n${vr};`).join('\n\n');
}

export default function App() {
  const { t } = useTranslation();
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [fileName, setFileName] = useState('');
  const [tableName, setTableName] = useState('');
  const [dialect, setDialect] = useState<Dialect>('mysql');
  const [includeCreate, setIncludeCreate] = useState(true);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  const parseFile = useCallback((file: File) => {
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const parsed: SheetData[] = wb.SheetNames.map(name => {
          const ws = wb.Sheets[name];
          const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
          if (json.length === 0) return { name, headers: [], rows: [] as string[][] };
          const headers = (json[0] as string[]).map(String);
          const rows = json.slice(1).map(row =>
            (row as string[]).map(cell => String(cell))
          );
          return { name, headers, rows };
        });
        setSheets(parsed);
        setActiveSheet(0);
        const defaultName = file.name.replace(/\.(xlsx?|xls)$/i, '').replace(/[^a-zA-Z0-9_]/g, '_');
        setTableName(defaultName);
      } catch (err: unknown) {
        setError('解析文件失败：' + (err instanceof Error ? err.message : '未知错误'));
        setSheets([]);
      }
    };
    reader.onerror = () => {
      setError('读取文件失败');
      setSheets([]);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  }, [parseFile]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const sql = useMemo(() => {
    if (sheets.length === 0) return '';
    const sheet = sheets[activeSheet];
    if (!sheet || sheet.headers.length === 0) return '-- No columns detected';

    const name = tableName || 'table_name';
    const parts: string[] = [];

    if (includeCreate) {
      parts.push(generateCreateTable(name, sheet.headers, sheet.rows, dialect));
    }
    parts.push(generateInserts(name, sheet.headers, sheet.rows, dialect));

    return parts.join('\n\n');
  }, [sheets, activeSheet, tableName, dialect, includeCreate]);

  const currentSheet = sheets[activeSheet];
  const previewRows = currentSheet ? currentSheet.rows.slice(0, 100) : [];

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName || 'export'}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>{t('tools.xlsx-to-sql.title')}</h1>
        <span className="subtitle">{t('tools.xlsx-to-sql.desc')}</span>
      </header>

      <div
        className={`drop-zone${dragOver ? ' drag-over' : ''}${fileName ? ' has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {fileName ? (
          <div className="file-loaded">
            <span className="file-icon">📊</span>
            <span className="file-name">{fileName}</span>
            <span className="file-sheets">{sheets.length} 个工作表</span>
          </div>
        ) : (
          <div className="drop-prompt">
            <span className="drop-icon">📁</span>
            <span>拖拽 .xlsx/.xls 文件到此处，或点击选择</span>
          </div>
        )}
        <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="file-input" />
      </div>

      {error && <div className="error">{error}</div>}

      {sheets.length > 0 && (
        <>
          {/* Sheet tabs */}
          <div className="sheet-tabs">
            {sheets.map((s, i) => (
              <button
                key={s.name}
                className={`sheet-tab${i === activeSheet ? ' active' : ''}`}
                onClick={() => setActiveSheet(i)}
              >
                {s.name}
                <span className="sheet-row-count">({s.rows.length}行)</span>
              </button>
            ))}
          </div>

          {/* Table preview */}
          <div className="preview-section">
            <h3 className="section-title">数据预览（最多 100 行）</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="row-num">#</th>
                    {currentSheet?.headers.map((h, i) => (
                      <th key={i}>{h || `col_${i + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri}>
                      <td className="row-num">{ri + 1}</td>
                      {currentSheet!.headers.map((_, ci) => (
                        <td key={ci}>{row[ci] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {currentSheet && currentSheet.rows.length > 100 && (
              <div className="preview-hint">仅显示前 100 行，共 {currentSheet.rows.length} 行</div>
            )}
          </div>

          {/* Options */}
          <div className="options-bar">
            <div className="option-group">
              <label>表名</label>
              <input
                type="text"
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                className="table-name-input"
                placeholder="table_name"
              />
            </div>

            <div className="option-group">
              <label>方言</label>
              <div className="dialect-btns">
                {(['mysql', 'postgresql', 'sqlite'] as Dialect[]).map(d => (
                  <button
                    key={d}
                    className={dialect === d ? 'active' : ''}
                    onClick={() => setDialect(d)}
                  >
                    {{ mysql: 'MySQL', postgresql: 'PostgreSQL', sqlite: 'SQLite' }[d]}
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeCreate}
                  onChange={e => setIncludeCreate(e.target.checked)}
                />
                CREATE TABLE
              </label>
            </div>
          </div>

          {/* SQL Output */}
          <div className="sql-output-section">
            <div className="sql-output-header">
              <h3 className="section-title">生成的 SQL</h3>
              <div className="sql-actions">
                <button className="sql-btn copy" onClick={handleCopy}>
                  {copied ? '已复制' : '复制 SQL'}
                </button>
                <button className="sql-btn download" onClick={handleDownload}>
                  下载 .sql
                </button>
              </div>
            </div>
            <pre className="sql-output"><code>{sql}</code></pre>
          </div>
        </>
      )}
    </div>
  );
}
