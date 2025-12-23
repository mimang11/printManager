/**
 * ============================================
 * Preload 脚本 - IPC 通信桥接
 * ============================================
 * 这个脚本在渲染进程加载前执行
 * 通过 contextBridge 安全地暴露 API 给渲染进程
 */

import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from '../shared/types';

/**
 * 暴露给渲染进程的 API
 * 渲染进程可以通过 window.electronAPI 访问这些方法
 */
const electronAPI: ElectronAPI = {
  // ========== 打印机管理 ==========
  
  // 获取所有打印机配置
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  
  // 添加新打印机
  addPrinter: (printer) => ipcRenderer.invoke('add-printer', printer),
  
  // 更新打印机配置
  updatePrinter: (printer) => ipcRenderer.invoke('update-printer', printer),
  
  // 删除打印机
  deletePrinter: (id) => ipcRenderer.invoke('delete-printer', id),

  // ========== 爬虫操作 ==========
  
  // 测试抓取
  testScrape: (url, selector) => ipcRenderer.invoke('test-scrape', url, selector),
  
  // 刷新所有打印机
  refreshAll: () => ipcRenderer.invoke('refresh-all'),
  
  // 刷新单个打印机
  refreshOne: (printerId) => ipcRenderer.invoke('refresh-one', printerId),

  // ========== 打印机详情 ==========
  
  // 获取打印机详情
  getPrinterDetail: (baseUrl) => ipcRenderer.invoke('get-printer-detail', baseUrl),

  // ========== 数据查询 ==========
  
  // 获取历史记录
  getRecords: (printerId, startDate, endDate) => 
    ipcRenderer.invoke('get-records', printerId, startDate, endDate),
  
  // 获取看板统计数据
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  
  // 获取图表数据
  getChartData: (days) => ipcRenderer.invoke('get-chart-data', days),
  
  // 获取饼图数据
  getPieChartData: () => ipcRenderer.invoke('get-pie-chart-data'),
  
  // 获取对比数据
  getComparisonData: (printerId) => ipcRenderer.invoke('get-comparison-data', printerId),
  
  // 获取月度营收明细
  getMonthlyRevenueDetail: (year, month) => ipcRenderer.invoke('get-monthly-revenue-detail', year, month),
  
  // 获取月度营收数据（含每台机器明细）
  getMonthlyRevenueData: (year, month) => ipcRenderer.invoke('get-monthly-revenue-data', year, month),

  // ========== 其他营收管理 ==========
  
  // 获取其他营收
  getOtherRevenues: (year, month) => ipcRenderer.invoke('get-other-revenues', year, month),
  
  // 添加其他营收
  addOtherRevenue: (revenue) => ipcRenderer.invoke('add-other-revenue', revenue),
  
  // 删除其他营收
  deleteOtherRevenue: (id) => ipcRenderer.invoke('delete-other-revenue', id),

  // ========== 导入历史数据 ==========
  
  // 导入历史数据
  importHistoryData: () => ipcRenderer.invoke('import-history-data'),
};

// 使用 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
