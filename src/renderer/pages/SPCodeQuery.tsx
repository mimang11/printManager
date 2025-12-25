/**
 * SP代码查询页面 - 查询打印机SP维修代码
 */
import React, { useState, useMemo } from 'react';
import codesData from '../../ricoh_mp9002_codes.json';

interface SPCode {
  code: string;
  description: string;
}

const spCodes: SPCode[] = codesData.spCodes;

function SPCodeQuery() {
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<SPCode | null>(null);
  const [notFound, setNotFound] = useState(false);

  // 过滤显示的SP代码列表
  const filteredCodes = useMemo(() => {
    if (!searchCode.trim()) {
      return spCodes.slice(0, 50); // 默认显示前50个
    }
    const keyword = searchCode.trim().toUpperCase().replace('SP', '');
    return spCodes.filter(sp => 
      sp.code.toUpperCase().includes(keyword) || 
      sp.description.includes(searchCode.trim())
    ).slice(0, 100);
  }, [searchCode]);

  const handleSearch = () => {
    const code = searchCode.trim().toUpperCase();
    if (!code) return;
    
    // 标准化搜索代码
    const normalizedCode = code.startsWith('SP') ? code : 'SP' + code;
    
    const result = spCodes.find(sp => 
      sp.code.toUpperCase() === normalizedCode ||
      sp.code.toUpperCase() === code
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">SP代码查询</h1>
        <span style={{ color: '#6b7280', fontSize: '14px' }}>
          共 {spCodes.length} 个SP代码 (理光 MP9002)
        </span>
      </div>

      <div className="card">
        <div className="card-title">查询SP维修代码</div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="输入SP代码或关键词，如 SP5801 或 定影"
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
            background: '#f0fdf4', 
            border: '1px solid #22c55e', 
            borderRadius: '8px', 
            padding: '20px' 
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#166534' }}>
              {searchResult.code}
            </h3>
            <p style={{ margin: '0', color: '#4b5563', lineHeight: '1.6' }}>
              {searchResult.description}
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
            未找到代码 "{searchCode.toUpperCase()}" 的相关信息
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-title">
          SP代码列表 
          {searchCode.trim() && <span style={{ fontWeight: 'normal', color: '#6b7280' }}> (搜索结果: {filteredCodes.length})</span>}
        </div>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>代码</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {filteredCodes.map((sp) => (
                <tr 
                  key={sp.code} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSearchCode(sp.code);
                    setSearchResult(sp);
                    setNotFound(false);
                  }}
                >
                  <td style={{ fontWeight: 600, color: '#3b82f6' }}>{sp.code}</td>
                  <td style={{ color: '#4b5563' }}>{sp.description}</td>
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

export default SPCodeQuery;
