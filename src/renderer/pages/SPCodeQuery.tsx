/**
 * SP代码查询页面 - 查询打印机SP维修代码
 */
import React, { useState } from 'react';

// SP代码数据库（可根据实际需要扩展）
const SP_CODES: Record<string, { name: string; description: string; steps: string[] }> = {
  'SP5-810': {
    name: '定影单元寿命重置',
    description: '重置定影单元计数器',
    steps: ['进入SP模式', '选择SP5-810', '按执行键重置']
  },
  'SP5-811': {
    name: '转印带寿命重置',
    description: '重置转印带计数器',
    steps: ['进入SP模式', '选择SP5-811', '按执行键重置']
  },
  'SP5-812': {
    name: '显影单元寿命重置',
    description: '重置显影单元计数器',
    steps: ['进入SP模式', '选择SP5-812', '按执行键重置']
  },
  'SP5-820': {
    name: '感光鼓寿命重置',
    description: '重置感光鼓计数器',
    steps: ['进入SP模式', '选择SP5-820', '按执行键重置']
  },
  'SP5-301': {
    name: '总计数器查看',
    description: '查看打印机总打印量',
    steps: ['进入SP模式', '选择SP5-301', '查看显示数值']
  },
  'SP5-302': {
    name: '彩色计数器查看',
    description: '查看彩色打印量',
    steps: ['进入SP模式', '选择SP5-302', '查看显示数值']
  },
  'SP2-001': {
    name: '系统初始化',
    description: '系统参数初始化',
    steps: ['进入SP模式', '选择SP2-001', '确认执行', '等待重启']
  },
  'SP5-832': {
    name: '废粉盒计数重置',
    description: '重置废粉盒计数器',
    steps: ['进入SP模式', '选择SP5-832', '按执行键重置']
  },
};

function SPCodeQuery() {
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<typeof SP_CODES[string] | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = () => {
    const code = searchCode.trim().toUpperCase();
    if (!code) return;
    
    const result = SP_CODES[code];
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
      </div>

      <div className="card">
        <div className="card-title">查询SP维修代码</div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="输入SP代码，如 SP5-810"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{ flex: 1, maxWidth: '300px' }}
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
              {searchCode.toUpperCase()} - {searchResult.name}
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#4b5563' }}>
              {searchResult.description}
            </p>
            <div>
              <strong style={{ color: '#374151' }}>操作步骤：</strong>
              <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: '#4b5563' }}>
                {searchResult.steps.map((step, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{step}</li>
                ))}
              </ol>
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
            未找到代码 "{searchCode.toUpperCase()}" 的相关信息
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-title">常用SP代码列表</div>
        <table className="table">
          <thead>
            <tr>
              <th>代码</th>
              <th>名称</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(SP_CODES).map(([code, info]) => (
              <tr 
                key={code} 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSearchCode(code);
                  setSearchResult(info);
                  setNotFound(false);
                }}
              >
                <td style={{ fontWeight: 600, color: '#3b82f6' }}>{code}</td>
                <td>{info.name}</td>
                <td style={{ color: '#6b7280' }}>{info.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SPCodeQuery;
