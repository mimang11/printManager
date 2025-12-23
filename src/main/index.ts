/**
 * ============================================
 * Electron 主进程入口文件
 * ============================================
 * 这是 Electron 应用的主进程，负责：
 * 1. 创建应用窗口
 * 2. 处理 IPC 通信
 * 3. 管理文件系统操作
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDataDirectory, loadConfig, saveConfig, loadRecords, saveRecords, loadOtherRevenues, saveOtherRevenues } from './fileManager';
import { scrapeCounter, testScrapeUrl, fetchPrinterDetail } from './scraper';
import { calculateDashboardStats, calculateChartData, calculatePieChartData, calculateComparisonData, calculateMonthlyRevenueDetail, calculateMonthlyRevenueData } from './analytics';
import { PrinterConfig, DailyRecord, ScrapeResult, OtherRevenue } from '../shared/types';
import { v4 as uuidv4 } from 'uuid';

// 保存主窗口的引用，防止被垃圾回收
let mainWindow: BrowserWindow | null = null;

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      // preload 脚本路径 - 用于安全地暴露 API 给渲染进程
      preload: path.join(__dirname, 'preload.js'),
      // 禁用 Node.js 集成 (安全考虑)
      nodeIntegration: false,
      // 启用上下文隔离 (安全考虑)
      contextIsolation: true,
    },
    // 窗口标题
    title: '打印机管理系统',
    // 隐藏默认菜单栏
    autoHideMenuBar: true,
  });

  // 开发模式下加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式下加载打包后的 HTML 文件
    // __dirname 是 dist/main/main，所以需要向上两级到 dist，再进入 renderer
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  // 窗口关闭时清除引用
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 应用准备就绪时创建窗口
 */
app.whenReady().then(async () => {
  // 初始化数据目录
  await initDataDirectory();
  // 创建窗口
  createWindow();

  // macOS 特殊处理：点击 dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用 (Windows/Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================
// IPC 处理器 - 打印机管理
// ============================================

/**
 * 获取所有打印机配置
 */
ipcMain.handle('get-printers', async (): Promise<PrinterConfig[]> => {
  const config = await loadConfig();
  return config.printers;
});

/**
 * 添加新打印机
 */
ipcMain.handle('add-printer', async (_, printerData: Omit<PrinterConfig, 'id' | 'last_updated' | 'status'>): Promise<PrinterConfig> => {
  const config = await loadConfig();
  
  const newPrinter: PrinterConfig = {
    ...printerData,
    id: uuidv4(),
    last_updated: new Date().toISOString(),
    status: 'offline',
  };
  
  config.printers.push(newPrinter);
  await saveConfig(config);
  
  return newPrinter;
});

/**
 * 更新打印机配置
 */
ipcMain.handle('update-printer', async (_, printer: PrinterConfig): Promise<PrinterConfig> => {
  const config = await loadConfig();
  const index = config.printers.findIndex(p => p.id === printer.id);
  
  if (index === -1) {
    throw new Error('打印机不存在');
  }
  
  printer.last_updated = new Date().toISOString();
  config.printers[index] = printer;
  await saveConfig(config);
  
  return printer;
});

/**
 * 删除打印机
 */
ipcMain.handle('delete-printer', async (_, id: string): Promise<boolean> => {
  const config = await loadConfig();
  const index = config.printers.findIndex(p => p.id === id);
  
  if (index === -1) {
    return false;
  }
  
  config.printers.splice(index, 1);
  await saveConfig(config);
  
  return true;
});

// ============================================
// IPC 处理器 - 爬虫操作
// ============================================

/**
 * 测试抓取 - 验证 URL 和选择器是否有效
 */
ipcMain.handle('test-scrape', async (_, url: string, selector: string): Promise<ScrapeResult> => {
  return await testScrapeUrl(url, selector);
});

/**
 * 刷新所有打印机数据
 */
ipcMain.handle('refresh-all', async (): Promise<ScrapeResult[]> => {
  const config = await loadConfig();
  const records = await loadRecords();
  const results: ScrapeResult[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (const printer of config.printers) {
    const result = await scrapeCounter(printer);
    results.push(result);

    if (result.success && result.counter !== undefined) {
      // 更新打印机状态
      printer.status = 'online';
      printer.last_updated = new Date().toISOString();

      // 计算日增量
      const yesterdayRecord = records.find(r => 
        r.printer_id === printer.id && 
        r.date === getYesterdayDate()
      );
      const dailyIncrement = yesterdayRecord 
        ? result.counter - yesterdayRecord.total_counter 
        : 0;

      // 查找或创建今日记录
      const existingIndex = records.findIndex(r => 
        r.printer_id === printer.id && r.date === today
      );

      const newRecord: DailyRecord = {
        record_id: existingIndex >= 0 ? records[existingIndex].record_id : uuidv4(),
        printer_id: printer.id,
        date: today,
        total_counter: result.counter,
        daily_increment: dailyIncrement > 0 ? dailyIncrement : 0,
        timestamp: Date.now(),
      };

      if (existingIndex >= 0) {
        records[existingIndex] = newRecord;
      } else {
        records.push(newRecord);
      }
    } else {
      printer.status = result.error?.includes('连接') ? 'offline' : 'error';
    }
  }

  await saveConfig(config);
  await saveRecords(records);

  return results;
});

/**
 * 刷新单个打印机数据
 */
ipcMain.handle('refresh-one', async (_, printerId: string): Promise<ScrapeResult> => {
  const config = await loadConfig();
  const printer = config.printers.find(p => p.id === printerId);

  if (!printer) {
    return { success: false, printer_id: printerId, error: '打印机不存在', timestamp: Date.now() };
  }

  const result = await scrapeCounter(printer);
  
  if (result.success && result.counter !== undefined) {
    const records = await loadRecords();
    const today = new Date().toISOString().split('T')[0];
    
    printer.status = 'online';
    printer.last_updated = new Date().toISOString();

    const yesterdayRecord = records.find(r => 
      r.printer_id === printer.id && r.date === getYesterdayDate()
    );
    const dailyIncrement = yesterdayRecord 
      ? result.counter - yesterdayRecord.total_counter 
      : 0;

    const existingIndex = records.findIndex(r => 
      r.printer_id === printer.id && r.date === today
    );

    const newRecord: DailyRecord = {
      record_id: existingIndex >= 0 ? records[existingIndex].record_id : uuidv4(),
      printer_id: printer.id,
      date: today,
      total_counter: result.counter,
      daily_increment: dailyIncrement > 0 ? dailyIncrement : 0,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }

    await saveRecords(records);
  } else {
    printer.status = result.error?.includes('连接') ? 'offline' : 'error';
  }

  await saveConfig(config);
  return result;
});

// ============================================
// IPC 处理器 - 数据查询
// ============================================

ipcMain.handle('get-records', async (_, printerId?: string, startDate?: string, endDate?: string): Promise<DailyRecord[]> => {
  const records = await loadRecords();
  return records.filter(r => {
    if (printerId && r.printer_id !== printerId) return false;
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;
    return true;
  });
});

ipcMain.handle('get-dashboard-stats', async () => {
  const config = await loadConfig();
  const records = await loadRecords();
  return calculateDashboardStats(config.printers, records);
});

ipcMain.handle('get-chart-data', async (_, days: number) => {
  const config = await loadConfig();
  const records = await loadRecords();
  return calculateChartData(records, days, config.printers);
});

ipcMain.handle('get-pie-chart-data', async () => {
  const config = await loadConfig();
  const records = await loadRecords();
  return calculatePieChartData(config.printers, records);
});

ipcMain.handle('get-comparison-data', async (_, printerId?: string) => {
  const records = await loadRecords();
  return calculateComparisonData(records, printerId);
});

// ============================================
// IPC 处理器 - 打印机详情
// ============================================

ipcMain.handle('get-printer-detail', async (_, baseUrl: string) => {
  return await fetchPrinterDetail(baseUrl);
});

// ============================================
// IPC 处理器 - 月度营收明细
// ============================================

ipcMain.handle('get-monthly-revenue-detail', async (_, year: number, month: number) => {
  const config = await loadConfig();
  const records = await loadRecords();
  return calculateMonthlyRevenueDetail(config.printers, records, year, month);
});

ipcMain.handle('get-monthly-revenue-data', async (_, year: number, month: number) => {
  const config = await loadConfig();
  const records = await loadRecords();
  const otherRevenues = await loadOtherRevenues();
  return calculateMonthlyRevenueData(config.printers, records, otherRevenues, year, month);
});

// ============================================
// IPC 处理器 - 其他营收管理
// ============================================

ipcMain.handle('get-other-revenues', async (_, year?: number, month?: number) => {
  const revenues = await loadOtherRevenues();
  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return revenues.filter(r => r.date.startsWith(prefix));
  }
  return revenues;
});

ipcMain.handle('add-other-revenue', async (_, revenueData: Omit<OtherRevenue, 'id' | 'timestamp'>) => {
  const revenues = await loadOtherRevenues();
  const newRevenue: OtherRevenue = {
    ...revenueData,
    id: uuidv4(),
    timestamp: Date.now(),
  };
  revenues.push(newRevenue);
  await saveOtherRevenues(revenues);
  return newRevenue;
});

ipcMain.handle('delete-other-revenue', async (_, id: string) => {
  const revenues = await loadOtherRevenues();
  const index = revenues.findIndex(r => r.id === id);
  if (index === -1) return false;
  revenues.splice(index, 1);
  await saveOtherRevenues(revenues);
  return true;
});

/**
 * 获取昨天的日期字符串
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}
