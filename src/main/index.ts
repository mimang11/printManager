/**
 * ============================================
 * Electron 主进程入口文件
 * ============================================
 * 这是 Electron 应用的主进程，负责：
 * 1. 创建应用窗口
 * 2. 处理 IPC 通信
 * 3. 管理文件系统操作
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { initDataDirectory, loadConfig, saveConfig, loadRecords, saveRecords, loadOtherRevenues, saveOtherRevenues } from './fileManager';
import { scrapeCounter, testScrapeUrl, fetchPrinterDetail } from './scraper';
import { calculateDashboardStats, calculateChartData, calculatePieChartData, calculateComparisonData, calculateMonthlyRevenueDetail, calculateMonthlyRevenueData } from './analytics';
import { PrinterConfig, DailyRecord, ScrapeResult, OtherRevenue } from '../shared/types';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

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

// ============================================
// IPC 处理器 - 导入历史数据
// ============================================

ipcMain.handle('import-history-data', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择历史数据文件',
    filters: [
      { name: 'Excel/CSV', extensions: ['xlsx', 'xls', 'csv'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, message: '已取消' };
  }

  try {
    const filePath = result.filePaths[0];
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    if (data.length === 0) {
      return { success: false, message: '文件为空' };
    }

    const config = await loadConfig();
    const records = await loadRecords();
    const printers = config.printers;

    // 获取表头（除了日期列）
    const headers = Object.keys(data[0]).filter(h => h !== '日期');
    
    // 只进行精确匹配打印机别名
    const printerMap = new Map<string, PrinterConfig>();
    const unmatchedHeaders: string[] = [];
    
    headers.forEach(header => {
      const printer = printers.find(p => p.alias === header);
      if (printer) {
        printerMap.set(header, printer);
      } else {
        unmatchedHeaders.push(header);
      }
    });

    if (printerMap.size === 0) {
      const printerAliases = printers.map(p => p.alias).join('、');
      return { 
        success: false, 
        message: `未找到匹配的打印机别名！\n\nExcel表头: ${headers.join('、')}\n系统中的打印机: ${printerAliases}\n\n请修改Excel表头与系统中的打印机别名完全一致。`
      };
    }

    if (unmatchedHeaders.length > 0) {
      console.log(`以下表头未匹配到打印机，将跳过: ${unmatchedHeaders.join('、')}`);
    }

    let importedCount = 0;
    let skippedCount = 0;

    // 按日期排序数据
    const sortedData = [...data].sort((a, b) => {
      const dateA = typeof a['日期'] === 'number' ? a['日期'] : new Date(a['日期']).getTime();
      const dateB = typeof b['日期'] === 'number' ? b['日期'] : new Date(b['日期']).getTime();
      return dateA - dateB;
    });

    // 记录每台打印机的前一天计数器值
    const prevCounters = new Map<string, number>();

    for (const row of sortedData) {
      let dateStr = row['日期'];
      if (!dateStr) continue;

      // 处理日期格式
      if (typeof dateStr === 'number') {
        // Excel 日期序列号
        const date = XLSX.SSF.parse_date_code(dateStr);
        dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      } else if (typeof dateStr === 'string') {
        // 尝试解析各种日期格式
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          dateStr = parsed.toISOString().split('T')[0];
        }
      }

      // 验证日期格式
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        skippedCount++;
        continue;
      }

      for (const [header, printer] of printerMap) {
        const totalCounter = parseInt(row[header]) || 0;
        if (totalCounter <= 0) continue;

        // 计算每日增量
        const prevCounter = prevCounters.get(printer.id) || 0;
        const dailyIncrement = prevCounter > 0 ? Math.max(0, totalCounter - prevCounter) : 0;
        prevCounters.set(printer.id, totalCounter);

        // 第一天没有增量数据，跳过
        if (prevCounter === 0) continue;

        // 检查是否已存在该日期该打印机的记录
        const existingIndex = records.findIndex(
          r => r.date === dateStr && r.printer_id === printer.id
        );

        const record: DailyRecord = {
          record_id: existingIndex >= 0 ? records[existingIndex].record_id : uuidv4(),
          printer_id: printer.id,
          date: dateStr,
          total_counter: totalCounter,
          daily_increment: dailyIncrement,
          timestamp: Date.now(),
        };

        if (existingIndex >= 0) {
          records[existingIndex] = record;
        } else {
          records.push(record);
        }
        importedCount++;
      }
    }

    await saveRecords(records);

    return {
      success: true,
      message: `导入成功！共导入 ${importedCount} 条记录${skippedCount > 0 ? `，跳过 ${skippedCount} 行无效数据` : ''}`,
      matchedPrinters: Array.from(printerMap.keys()),
      unmatchedHeaders: unmatchedHeaders.length > 0 ? unmatchedHeaders : undefined,
    };
  } catch (error: any) {
    return { success: false, message: `导入失败: ${error.message}` };
  }
});

// ============================================
// IPC 处理器 - 更新损耗数量
// ============================================

ipcMain.handle('update-waste-count', async (_, date: string, printerId: string, wasteCount: number) => {
  const records = await loadRecords();
  const index = records.findIndex(r => r.date === date && r.printer_id === printerId);
  
  if (index === -1) {
    return false;
  }
  
  // 确保 wasteCount 不超过物理增量
  const maxWaste = records[index].daily_increment;
  records[index].waste_count = Math.min(Math.max(0, wasteCount), maxWaste);
  
  await saveRecords(records);
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
