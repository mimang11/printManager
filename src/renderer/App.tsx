/**
 * ============================================
 * App 主组件
 * ============================================
 * 这是应用的根组件，包含侧边栏导航和页面路由
 * 
 * React 基础概念：
 * - useState: 用于管理组件内部状态
 * - 组件: 可复用的 UI 单元，接收 props 返回 JSX
 */

import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import DeviceManager from './pages/DeviceManager';
import DataComparison from './pages/DataComparison';
import RevenueManager from './pages/RevenueManager';

// 定义页面类型
type PageType = 'dashboard' | 'devices' | 'comparison' | 'revenue';

/**
 * App 根组件
 * 管理当前显示的页面，渲染侧边栏和主内容区
 */
function App() {
  // useState 创建一个状态变量 currentPage，初始值为 'dashboard'
  // setCurrentPage 是更新这个状态的函数
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  // 根据 currentPage 渲染对应的页面组件
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'devices':
        return <DeviceManager />;
      case 'comparison':
        return <DataComparison />;
      case 'revenue':
        return <RevenueManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* 侧边栏 */}
      <aside className="sidebar">
        <div className="sidebar-title">🖨️ 打印机管理</div>
        <nav className="sidebar-nav">
          {/* 导航项 - 点击时调用 setCurrentPage 更新状态 */}
          <div 
            className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            <span className="nav-icon">📊</span>
            数据看板
          </div>
          <div 
            className={`nav-item ${currentPage === 'devices' ? 'active' : ''}`}
            onClick={() => setCurrentPage('devices')}
          >
            <span className="nav-icon">🖨️</span>
            设备管理
          </div>
          <div 
            className={`nav-item ${currentPage === 'comparison' ? 'active' : ''}`}
            onClick={() => setCurrentPage('comparison')}
          >
            <span className="nav-icon">📈</span>
            数据对比
          </div>
          <div 
            className={`nav-item ${currentPage === 'revenue' ? 'active' : ''}`}
            onClick={() => setCurrentPage('revenue')}
          >
            <span className="nav-icon">💰</span>
            营收管理
          </div>
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
