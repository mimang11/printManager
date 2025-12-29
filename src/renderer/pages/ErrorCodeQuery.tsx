/**
 * 错误代码查询页面 - 查询打印机错误代码及解决方案
 */
import React, { useState, useMemo, useEffect } from 'react';
import codesData from '../../ricoh_mp9002_codes.json';

interface ErrorCode {
  code: string;
  description: string;
  level?: string;
  details?: string;
  causes?: string[];
  solutions?: string[];
}

const errorCodes: ErrorCode[] = codesData.errorCodes;

// localStorage key (用于迁移)
const NOTES_STORAGE_KEY = 'error_code_notes';

function ErrorCodeQuery() {
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<ErrorCode | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  // 从云端加载备注
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const result = await window.electronAPI.getCodeNotes('error');
        if (result.success && result.data) {
          const notesMap: Record<string, string> = {};
          result.data.forEach(n => { notesMap[n.code] = n.note; });
          setNotes(notesMap);
          
          // 检查是否有本地备注需要迁移
          const localNotes = localStorage.getItem(NOTES_STORAGE_KEY);
          if (localNotes) {
            const localData = JSON.parse(localNotes);
            const toImport = Object.entries(localData)
              .filter(([code]) => !notesMap[code])
              .map(([code, note]) => ({ codeType: 'error' as const, code, note: note as string }));
            
            if (toImport.length > 0) {
              await window.electronAPI.importCodeNotes(toImport);
              toImport.forEach(item => { notesMap[item.code] = item.note; });
              setNotes({ ...notesMap });
            }
            localStorage.removeItem(NOTES_STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error('加载备注失败', e);
      }
    };
    loadNotes();
  }, []);

  // 保存备注到云端
  const saveNote = async (code: string, note: string) => {
    setSaving(true);
    try {
      await window.electronAPI.saveCodeNote('error', code, note);
      const newNotes = { ...notes };
      if (note.trim()) {
        newNotes[code] = note.trim();
      } else {
        delete newNotes[code];
      }
      setNotes(newNotes);
      setEditingNote(null);
      setNoteText('');
    } catch (e) {
      console.error('保存备注失败', e);
    } finally {
      setSaving(false);
    }
  };

  // 过滤显示的错误代码列表
  const filteredCodes = useMemo(() => {
    if (!searchCode.trim()) {
      return errorCodes.slice(0, 50);
    }
    const keyword = searchCode.trim().toUpperCase().replace('SC', '');
    return errorCodes.filter(ec => 
      ec.code.toUpperCase().includes(keyword) || 
      ec.description.includes(searchCode.trim())
    ).slice(0, 100);
  }, [searchCode]);

  const handleSearch = () => {
    const code = searchCode.trim().toUpperCase();
    if (!code) return;
    
    const normalizedCode = code.startsWith('SC') ? code : 'SC' + code;
    
    const result = errorCodes.find(ec => 
      ec.code.toUpperCase() === normalizedCode ||
      ec.code.toUpperCase() === code
    );
    
    if (result) {
      setSearchResult(result);
      setNotFound(false);
    } else {
      setSearchResult(null);
      setNotFound(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const startEditNote = (code: string) => {
    setEditingNote(code);
    setNoteText(notes[code] || '');
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'A': return '#dc2626';
      case 'B': return '#ea580c';
      case 'C': return '#ca8a04';
      case 'D': return '#2563eb';
      default: return '#6b7280';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">错误代码查询</h1>
        <span style={{ color: '#6b7280', fontSize: '14px' }}>
          共 {errorCodes.length} 个错误代码 (理光 MP9002)
        </span>
      </div>

      <div className="card">
        <div className="card-title">查询错误代码</div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="输入错误代码或关键词，如 SC300 或 定影"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{ flex: 1, maxWidth: '400px' }}
          />
          <button className="btn btn-primary" onClick={handleSearch}>
            查询
          </button>
        </div>

        {searchResult && (
          <div style={{ 
            background: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: '8px', 
            padding: '20px' 
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#92400e', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {searchResult.code}
              {searchResult.level && (
                <span style={{ 
                  fontSize: '12px', 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  background: getLevelColor(searchResult.level),
                  color: 'white'
                }}>
                  级别 {searchResult.level}
                </span>
              )}
            </h3>
            <p style={{ margin: '0 0 12px 0', color: '#4b5563', lineHeight: '1.6' }}>
              <strong>故障描述：</strong>{searchResult.description}
            </p>
            {searchResult.details && (
              <p style={{ margin: '0 0 12px 0', color: '#4b5563', lineHeight: '1.6' }}>
                <strong>详细信息：</strong>{searchResult.details}
              </p>
            )}
            {searchResult.causes && searchResult.causes.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#374151' }}>可能原因：</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: '#4b5563' }}>
                  {searchResult.causes.filter(c => c.trim()).map((cause, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{cause}</li>
                  ))}
                </ul>
              </div>
            )}
            {searchResult.solutions && searchResult.solutions.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#374151' }}>解决方案：</strong>
                <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: '#4b5563' }}>
                  {searchResult.solutions.map((solution, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{solution.replace(/^\d+[\.\、]\s*/, '')}</li>
                  ))}
                </ol>
              </div>
            )}
            
            {/* 备注区域 */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #fcd34d' }}>
              <strong style={{ color: '#374151' }}>备注：</strong>
              {editingNote === searchResult.code ? (
                <div style={{ marginTop: '8px' }}>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="输入备注信息..."
                    style={{ 
                      width: '100%', 
                      minHeight: '80px', 
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => saveNote(searchResult.code, noteText)}
                      style={{ padding: '4px 12px', fontSize: '13px' }}
                      disabled={saving}
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button 
                      className="btn" 
                      onClick={() => { setEditingNote(null); setNoteText(''); }}
                      style={{ padding: '4px 12px', fontSize: '13px' }}
                      disabled={saving}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '8px' }}>
                  {notes[searchResult.code] ? (
                    <p style={{ 
                      margin: '0 0 8px 0', 
                      color: '#4b5563', 
                      background: '#ecfdf5',
                      padding: '8px',
                      borderRadius: '4px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {notes[searchResult.code]}
                    </p>
                  ) : (
                    <p style={{ margin: '0 0 8px 0', color: '#9ca3af', fontStyle: 'italic' }}>
                      暂无备注
                    </p>
                  )}
                  <button 
                    className="btn" 
                    onClick={() => startEditNote(searchResult.code)}
                    style={{ padding: '4px 12px', fontSize: '13px' }}
                  >
                    {notes[searchResult.code] ? '编辑备注' : '添加备注'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {notFound && (
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #ef4444', 
            borderRadius: '8px', 
            padding: '20px',
            color: '#991b1b'
          }}>
            未找到错误代码 "{searchCode.toUpperCase()}" 的相关信息
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-title">
          错误代码列表
          {searchCode.trim() && <span style={{ fontWeight: 'normal', color: '#6b7280' }}> (搜索结果: {filteredCodes.length})</span>}
        </div>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>代码</th>
                <th>故障描述</th>
                <th style={{ width: '60px' }}>备注</th>
              </tr>
            </thead>
            <tbody>
              {filteredCodes.map((ec) => (
                <tr 
                  key={ec.code} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSearchCode(ec.code);
                    setSearchResult(ec);
                    setNotFound(false);
                  }}
                >
                  <td style={{ fontWeight: 600, color: '#ef4444' }}>{ec.code}</td>
                  <td style={{ color: '#4b5563' }}>{ec.description}</td>
                  <td>
                    {notes[ec.code] && (
                      <span style={{ 
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#f59e0b'
                      }} title="有备注" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!searchCode.trim() && (
          <div style={{ marginTop: '12px', color: '#9ca3af', fontSize: '13px', textAlign: 'center' }}>
            显示前50条，输入关键词搜索更多
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorCodeQuery;
