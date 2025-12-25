/**
 * 错误代码查询页面 - 查询打印机错误代码及解决方案
 */
import React, { useState, useMemo } from 'react';
import codesData from '../../ricoh_mp9002_codes.json';

interface ErrorCode {
  code: string;
  description: string;
  level?: string;
}

const errorCodes: ErrorCode[] = codesData.errorCodes;

function ErrorCodeQuery() {
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<ErrorCode | null>(null);
  const [notFound, setNotFound] = useState(false);

  // 过滤显示的错误代码列表
  const filteredCodes = useMemo(() => {
    if (!searchCode.trim()) {
      return errorCodes.slice(0, 50); // 默认显示前50个
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
    
    // 标准化搜索代码
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

  // 获取错误级别的颜色
  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'A': return '#dc2626'; // 红色 - 严重
      case 'B': return '#ea580c'; // 橙色 - 较严重
      case 'C': return '#ca8a04'; // 黄色 - 中等
      case 'D': return '#2563eb'; // 蓝色 - 一般
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
            <p style={{ margin: '0', color: '#4b5563', lineHeight: '1.6' }}>
              <strong>故障描述：</strong>{searchResult.description}
            </p>
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
                <th style={{ width: '120px' }}>代码</th>
                <th>故障描述</th>
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
