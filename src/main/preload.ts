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

  // ========== 损耗管理 ==========
  
  // 更新损耗数量
  updateWasteCount: (date, printerId, wasteCount) => ipcRenderer.invoke('update-waste-count', date, printerId, wasteCount),

  // ========== 云端数据 (Turso) ==========
  
  // 获取云端打印机列表
  getCloudPrinters: () => ipcRenderer.invoke('get-cloud-printers'),
  
  // 获取云端打印记录
  getCloudLogs: (machineName, startDate, endDate) => ipcRenderer.invoke('get-cloud-logs', machineName, startDate, endDate),
  
  // 获取云端每日统计
  getCloudDailyStats: (startDate, endDate) => ipcRenderer.invoke('get-cloud-daily-stats', startDate, endDate),
  
  // 测试云端连接
  testCloudConnection: () => ipcRenderer.invoke('test-cloud-connection'),

  // ========== 云端打印机 CRUD (printers 表) ==========
  
  // 获取云端打印机配置列表
  getCloudPrinterConfigs: () => ipcRenderer.invoke('get-cloud-printer-configs'),
  
  // 添加云端打印机
  addCloudPrinter: (printer) => ipcRenderer.invoke('add-cloud-printer', printer),
  
  // 更新云端打印机
  updateCloudPrinter: (id, printer) => ipcRenderer.invoke('update-cloud-printer', id, printer),
  
  // 删除云端打印机
  deleteCloudPrinter: (id) => ipcRenderer.invoke('delete-cloud-printer', id),

  // ========== IP 检查和统计 ==========
  
  // 检查 IP 是否存在于 printer_logs
  checkIPExists: (machineIP) => ipcRenderer.invoke('check-ip-exists', machineIP),
  
  // 获取所有打印机统计数据
  getAllPrinterStats: () => ipcRenderer.invoke('get-all-printer-stats'),
  
  // 一键添加 printer_logs 表中的打印机
  autoAddPrintersFromLogs: () => ipcRenderer.invoke('auto-add-printers-from-logs'),

  // ========== 云端营收管理 ==========
  
  // 获取云端月度营收数据
  getCloudMonthlyRevenue: (year, month) => ipcRenderer.invoke('get-cloud-monthly-revenue', year, month),
  
  // 添加云端其他收入
  addCloudOtherRevenue: (data) => ipcRenderer.invoke('add-cloud-other-revenue', data),
  
  // 更新损耗记录
  updateCloudWaste: (machineIP, wasteDate, wasteCount) => ipcRenderer.invoke('update-cloud-waste', machineIP, wasteDate, wasteCount),
};

// 使用 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
