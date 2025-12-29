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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
