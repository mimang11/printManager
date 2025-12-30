/**
 * Preload 脚本 - IPC 通信桥接
 */

import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from '../shared/types';

const electronAPI: ElectronAPI = {
  // 打印机详情
  getPrinterDetail: (baseUrl) => ipcRenderer.invoke('get-printer-detail', baseUrl),

  // 云端打印机 CRUD
  getCloudPrinterConfigs: () => ipcRenderer.invoke('get-cloud-printer-configs'),
  addCloudPrinter: (printer) => ipcRenderer.invoke('add-cloud-printer', printer),
  updateCloudPrinter: (id, printer) => ipcRenderer.invoke('update-cloud-printer', id, printer),
  deleteCloudPrinter: (id) => ipcRenderer.invoke('delete-cloud-printer', id),

  // IP 检查和统计
  checkIPExists: (machineIP) => ipcRenderer.invoke('check-ip-exists', machineIP),
  getAllPrinterStats: () => ipcRenderer.invoke('get-all-printer-stats'),
  autoAddPrintersFromLogs: () => ipcRenderer.invoke('auto-add-printers-from-logs'),

  // 云端营收管理
  getCloudMonthlyRevenue: (year, month) => ipcRenderer.invoke('get-cloud-monthly-revenue', year, month),
  addCloudOtherRevenue: (data) => ipcRenderer.invoke('add-cloud-other-revenue', data),
  updateCloudWaste: (machineIP, wasteDate, wasteCount) => ipcRenderer.invoke('update-cloud-waste', machineIP, wasteDate, wasteCount),
  getWasteRecords: (machineIP, wasteDate) => ipcRenderer.invoke('get-waste-records', machineIP, wasteDate),
  addWasteRecord: (data) => ipcRenderer.invoke('add-waste-record', data),
  deleteWasteRecord: (id) => ipcRenderer.invoke('delete-waste-record', id),

  // 系统设置
  getMonthlyRent: () => ipcRenderer.invoke('get-monthly-rent'),
  updateMonthlyRent: (rent) => ipcRenderer.invoke('update-monthly-rent', rent),

  // 看板数据
  getDashboardStats: (startDate, endDate, prevStartDate, prevEndDate) => ipcRenderer.invoke('get-dashboard-stats', startDate, endDate, prevStartDate, prevEndDate),
  getDashboardChart: (dates) => ipcRenderer.invoke('get-dashboard-chart', dates),
  getDashboardPie: (startDate, endDate) => ipcRenderer.invoke('get-dashboard-pie', startDate, endDate),
  syncPrinterData: () => ipcRenderer.invoke('sync-printer-data'),
  getCloudComparison: (machineIP) => ipcRenderer.invoke('get-cloud-comparison', machineIP),

  // 代码备注管理
  getCodeNotes: (codeType) => ipcRenderer.invoke('get-code-notes', codeType),
  saveCodeNote: (codeType, code, note) => ipcRenderer.invoke('save-code-note', codeType, code, note),
  importCodeNotes: (notes) => ipcRenderer.invoke('import-code-notes', notes),
  
  // 操作人管理
  getOperators: () => ipcRenderer.invoke('get-operators'),
  addOperator: (name) => ipcRenderer.invoke('add-operator', name),
  updateOperator: (id, name) => ipcRenderer.invoke('update-operator', id, name),
  deleteOperator: (id) => ipcRenderer.invoke('delete-operator', id),
  
  // 损耗理由管理
  getDamageReasons: () => ipcRenderer.invoke('get-damage-reasons'),
  addDamageReason: (reason) => ipcRenderer.invoke('add-damage-reason', reason),
  updateDamageReason: (id, reason) => ipcRenderer.invoke('update-damage-reason', id, reason),
  deleteDamageReason: (id) => ipcRenderer.invoke('delete-damage-reason', id),
  
  // 其他收入明细管理
  getOtherRevenueRecords: (date) => ipcRenderer.invoke('get-other-revenue-records', date),
  addOtherRevenueRecord: (data) => ipcRenderer.invoke('add-other-revenue-record', data),
  deleteOtherRevenueRecord: (id) => ipcRenderer.invoke('delete-other-revenue-record', id),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
