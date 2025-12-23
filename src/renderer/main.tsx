/**
 * ============================================
 * React 应用入口文件
 * ============================================
 * 这是 React 应用的起点
 * ReactDOM.createRoot 创建根节点，然后渲染 App 组件
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// 获取 HTML 中的 root 元素
const rootElement = document.getElementById('root');

if (rootElement) {
  // createRoot 是 React 18 的新 API，用于创建根节点
  const root = ReactDOM.createRoot(rootElement);
  
  // 渲染 App 组件到根节点
  // StrictMode 会在开发模式下进行额外检查
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
