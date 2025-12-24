/**
 * App 主组件 - 包含侧边栏导航、页面路由和全局实时时钟
 */

import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import DeviceManager from './pages/DeviceManager';
import DataComparison from './pages/DataComparison';
import RevenueManager from './pages/RevenueManager';
import SPCodeQuery from './pages/SPCodeQuery';
import ErrorCodeQuery from './pages/ErrorCodeQuery';

type PageType = 'dashboard' | 'devices' | 'comparison' | 'revenue' | 'spcode' | 'errorcode';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());

  // 实时时钟更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'devices': return <DeviceManager />;
      case 'comparison': return <DataComparison />;
      case 'revenue': return <RevenueManager />;
      case 'spcode': return <SPCodeQuery />;
      case 'errorcode': return <ErrorCodeQuery />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-title">🖨️ 打印机管理</div>
        <nav className="sidebar-nav">
          <div className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}>
            <span className="nav-icon">📊</span>数据看板
          </div>
          <div className={`nav-item ${currentPage === 'devices' ? 'active' : ''}`}
            onClick={() => setCurrentPage('devices')}>
            <span className="nav-icon">🖨️</span>设备管理
          </div>
          <div className={`nav-item ${currentPage === 'comparison' ? 'active' : ''}`}
            onClick={() => setCurrentPage('comparison')}>
            <span className="nav-icon">📈</span>数据对比
          </div>
          <div className={`nav-item ${currentPage === 'revenue' ? 'active' : ''}`}
            onClick={() => setCurrentPage('revenue')}>
            <span className="nav-icon">💰</span>营收管理
          </div>
          <div className={`nav-item ${currentPage === 'spcode' ? 'active' : ''}`}
            onClick={() => setCurrentPage('spcode')}>
            <span className="nav-icon">🔧</span>SP代码查询
          </div>
          <div className={`nav-item ${currentPage === 'errorcode' ? 'active' : ''}`}
            onClick={() => setCurrentPage('errorcode')}>
            <span className="nav-icon">⚠️</span>错误代码查询
          </div>
        </nav>
      </aside>

      <main className="main-content">
        {renderPage()}
      </main>

      {/* 全局实时时钟 */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        fontSize: '14px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: 1000,
      }}>
        <span style={{ fontSize: '18px' }}>🕐</span>
        {formatTime(currentTime)}
      </div>
    </div>
  );
}

export default App;
