/**
 * ============================================
 * Electron 主进程入口文件
 * ============================================
 * 这是 Electron 应用的主进程，负责：
 * 1. 创建应用窗口
 * 2. 处理 IPC 通信
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fetchPrinterDetail } from './scraper';
import { initDatabase, closeDatabase, getAllPrinters, addPrinter as dbAddPrinter, updatePrinter as dbUpdatePrinter, deletePrinter as dbDeletePrinter, DBPrinter, checkIPExistsInLogs, getAllPrinterStats, getUniquePrintersFromLogs, getCloudMonthlyRevenueData, addCloudOtherRevenue, updateWasteRecord, getMonthlyRent, updateMonthlyRent, getDashboardStats, getDashboardChartData, getDashboardPieData, syncAllPrinterData, getCloudComparisonData, getAllCodeNotes, saveCodeNote, importCodeNotes } from './database';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: '打印机管理系统',
    autoHideMenuBar: true,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  initDatabase();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => { closeDatabase(); });

// ============================================
// IPC 处理器 - 打印机详情
// ============================================

ipcMain.handle('get-printer-detail', async (_, baseUrl: string) => {
  return await fetchPrinterDetail(baseUrl);
});

// ============================================
// IPC 处理器 - 云端打印机 CRUD
// ============================================

ipcMain.handle('get-cloud-printer-configs', async () => {
  try {
    const printers = await getAllPrinters();
    return { success: true, data: printers };
  } catch (error: any) {
    console.error('获取云端打印机配置失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-cloud-printer', async (_, printerData: Omit<DBPrinter, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    const ipCheck = await checkIPExistsInLogs(printerData.machine_ip);
    const status = ipCheck.exists ? 'online' : 'offline';
    const printer = await dbAddPrinter({ ...printerData, status });
    return { success: true, data: printer };
  } catch (error: any) {
    console.error('添加云端打印机失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-cloud-printer', async (_, id: number, printerData: Partial<DBPrinter>) => {
  try {
    const printer = await dbUpdatePrinter(id, printerData);
    return { success: true, data: printer };
  } catch (error: any) {
    console.error('更新云端打印机失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-cloud-printer', async (_, id: number) => {
  try {
    const result = await dbDeletePrinter(id);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('删除云端打印机失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-ip-exists', async (_, machineIP: string) => {
  try {
    const result = await checkIPExistsInLogs(machineIP);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-all-printer-stats', async () => {
  try {
    const stats = await getAllPrinterStats();
    return { success: true, data: stats };
  } catch (error: any) {
    console.error('获取打印机统计失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auto-add-printers-from-logs', async () => {
  try {
    const uniquePrinters = await getUniquePrintersFromLogs();
    const existingPrinters = await getAllPrinters();
    const existingIPs = new Set(existingPrinters.map(p => p.machine_ip));
    const newPrinters = uniquePrinters.filter(p => !existingIPs.has(p.machine_ip));
    
    if (newPrinters.length === 0) {
      return { success: true, added: 0, message: '所有打印机已存在，无需添加' };
    }
    
    let addedCount = 0;
    for (const printer of newPrinters) {
      await dbAddPrinter({
        machine_name: printer.machine_name,
        machine_ip: printer.machine_ip,
        printer_type: 'mono',
        cost_per_page: 0.05,
        price_per_page: 0.5,
        scrape_url: null,
        status: 'online',
      });
      addedCount++;
    }
    
    return { success: true, added: addedCount, message: `成功添加 ${addedCount} 台打印机` };
  } catch (error: any) {
    console.error('一键添加打印机失败:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC 处理器 - 云端营收管理
// ============================================

ipcMain.handle('get-cloud-monthly-revenue', async (_, year: number, month: number) => {
  try {
    const data = await getCloudMonthlyRevenueData(year, month);
    return { success: true, data };
  } catch (error: any) {
    console.error('获取云端月度营收失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-cloud-other-revenue', async (_, data: { date: string; amount: number; description: string; category: string }) => {
  try {
    await addCloudOtherRevenue(data);
    return { success: true };
  } catch (error: any) {
    console.error('添加云端其他收入失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-cloud-waste', async (_, machineIP: string, wasteDate: string, wasteCount: number) => {
  try {
    await updateWasteRecord(machineIP, wasteDate, wasteCount);
    return { success: true };
  } catch (error: any) {
    console.error('更新损耗记录失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-monthly-rent', async () => {
  try {
    const rent = await getMonthlyRent();
    return { success: true, data: rent };
  } catch (error: any) {
    console.error('获取月租金失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-monthly-rent', async (_, rent: number) => {
  try {
    await updateMonthlyRent(rent);
    return { success: true };
  } catch (error: any) {
    console.error('更新月租金失败:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC 处理器 - 看板数据
// ============================================

ipcMain.handle('get-dashboard-stats', async (_, startDate: string, endDate: string, prevStartDate: string, prevEndDate: string) => {
  try {
    const data = await getDashboardStats(startDate, endDate, prevStartDate, prevEndDate);
    return { success: true, data };
  } catch (error: any) {
    console.error('获取看板统计数据失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-dashboard-chart', async (_, dates: string[]) => {
  try {
    const data = await getDashboardChartData(dates);
    return { success: true, data };
  } catch (error: any) {
    console.error('获取看板图表数据失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-dashboard-pie', async (_, startDate: string, endDate: string) => {
  try {
    const data = await getDashboardPieData(startDate, endDate);
    return { success: true, data };
  } catch (error: any) {
    console.error('获取看板饼图数据失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sync-printer-data', async () => {
  try {
    const result = await syncAllPrinterData();
    return { success: true, data: result };
  } catch (error: any) {
    console.error('同步打印机数据失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-cloud-comparison', async (_, machineIP?: string) => {
  try {
    const data = await getCloudComparisonData(machineIP);
    return { success: true, data };
  } catch (error: any) {
    console.error('获取数据对比失败:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC 处理器 - 代码备注管理
// ============================================

ipcMain.handle('get-code-notes', async (_, codeType?: 'sp' | 'error') => {
  try {
    const notes = await getAllCodeNotes(codeType);
    return { success: true, data: notes };
  } catch (error: any) {
    console.error('获取备注失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-code-note', async (_, codeType: 'sp' | 'error', code: string, note: string) => {
  try {
    await saveCodeNote(codeType, code, note);
    return { success: true };
  } catch (error: any) {
    console.error('保存备注失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-code-notes', async (_, notes: { codeType: 'sp' | 'error'; code: string; note: string }[]) => {
  try {
    const count = await importCodeNotes(notes);
    return { success: true, data: count };
  } catch (error: any) {
    console.error('导入备注失败:', error);
    return { success: false, error: error.message };
  }
});
