/**
 * 错误代码查询页面 - 查询打印机错误代码及解决方案
 */
import React, { useState } from 'react';

// 错误代码数据库（可根据实际需要扩展）
const ERROR_CODES: Record<string, { name: string; cause: string; solution: string[] }> = {
  'SC101': {
    name: '曝光灯异常',
    cause: '曝光灯损坏或连接不良',
    solution: ['检查曝光灯连接', '更换曝光灯', '检查主板连接']
  },
  'SC300': {
    name: '定影温度异常',
    cause: '定影单元温度传感器故障或加热器损坏',
    solution: ['检查定影温度传感器', '检查定影加热器', '更换定影单元']
  },
  'SC301': {
    name: '定影温度过低',
    cause: '定影加热器故障或热敏电阻损坏',
    solution: ['检查定影加热灯', '检查热敏电阻', '检查电源板']
  },
  'SC302': {
    name: '定影温度过高',
    cause: '温控器故障或散热不良',
    solution: ['检查温控器', '清洁散热风扇', '检查定影单元']
  },
  'SC400': {
    name: '多边形马达异常',
    cause: '激光扫描单元马达故障',
    solution: ['检查多边形马达连接', '更换激光扫描单元', '检查主板']
  },
  'SC500': {
    name: '主马达异常',
    cause: '主驱动马达故障或卡纸',
    solution: ['清除卡纸', '检查主马达', '检查驱动板']
  },
  'SC541': {
    name: '感光鼓马达异常',
    cause: '感光鼓驱动马达故障',
    solution: ['检查感光鼓马达', '检查齿轮传动', '更换马达']
  },
  'SC542': {
    name: '转印带马达异常',
    cause: '转印带驱动故障',
    solution: ['检查转印带马达', '检查传动齿轮', '更换转印单元']
  },
  'SC543': {
    name: '显影马达异常',
    cause: '显影单元驱动故障',
    solution: ['检查显影马达', '检查离合器', '更换显影单元']
  },
  'SC670': {
    name: '废粉盒满',
    cause: '废粉收集盒已满',
    solution: ['更换废粉盒', '清空废粉盒', '重置废粉计数器(SP5-832)']
  },
  'SC672': {
    name: '碳粉浓度异常',
    cause: '碳粉传感器故障或碳粉不足',
    solution: ['添加碳粉', '检查碳粉传感器', '清洁显影单元']
  },
  'SC899': {
    name: '通讯错误',
    cause: '主板与各单元通讯故障',
    solution: ['检查各单元连接线', '重启打印机', '检查主板']
  },
};

function ErrorCodeQuery() {
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<typeof ERROR_CODES[string] | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = () => {
    const code = searchCode.trim().toUpperCase();
    if (!code) return;
    
    const result = ERROR_CODES[code];
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
        <h1 className="page-title">错误代码查询</h1>
      </div>

      <div className="card">
        <div className="card-title">查询错误代码</div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="输入错误代码，如 SC300"
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
            background: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: '8px', 
            padding: '20px' 
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#92400e' }}>
              {searchCode.toUpperCase()} - {searchResult.name}
            </h3>
            <p style={{ margin: '0 0 12px 0', color: '#4b5563' }}>
              <strong>故障原因：</strong>{searchResult.cause}
            </p>
            <div>
              <strong style={{ color: '#374151' }}>解决方案：</strong>
              <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: '#4b5563' }}>
                {searchResult.solution.map((step, index) => (
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
            未找到错误代码 "{searchCode.toUpperCase()}" 的相关信息
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-title">常见错误代码列表</div>
        <table className="table">
          <thead>
            <tr>
              <th>代码</th>
              <th>名称</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ERROR_CODES).map(([code, info]) => (
              <tr 
                key={code} 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSearchCode(code);
                  setSearchResult(info);
                  setNotFound(false);
                }}
              >
                <td style={{ fontWeight: 600, color: '#ef4444' }}>{code}</td>
                <td>{info.name}</td>
                <td style={{ color: '#6b7280' }}>{info.cause}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ErrorCodeQuery;
