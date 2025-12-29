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
import { initDatabase, getPrintersFromDB, getPrinterLogsFromDB, getDailyPrintCounts, closeDatabase, getAllPrinters, addPrinter as dbAddPrinter, updatePrinter as dbUpdatePrinter, deletePrinter as dbDeletePrinter, DBPrinter, checkIPExistsInLogs, getAllPrinterStats, getUniquePrintersFromLogs, getCloudMonthlyRevenueData, addCloudOtherRevenue, updateWasteRecord, getMonthlyRent, updateMonthlyRent, getDashboardStats, getDashboardChartData, getDashboardPieData, syncAllPrinterData } from './database';

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

      // 计算日增量 - 找最近一天的记录（不一定是昨天）
      const printerRecords = records
        .filter(r => r.printer_id === printer.id && r.date < today)
        .sort((a, b) => b.date.localeCompare(a.date)); // 按日期降序
      const lastRecord = printerRecords[0]; // 最近一天的记录
      const dailyIncrement = lastRecord 
        ? result.counter - lastRecord.total_counter 
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
        waste_count: existingIndex >= 0 ? (records[existingIndex].waste_count || 0) : 0,
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

    // 计算日增量 - 找最近一天的记录（不一定是昨天）
    const printerRecords = records
      .filter(r => r.printer_id === printer.id && r.date < today)
      .sort((a, b) => b.date.localeCompare(a.date)); // 按日期降序
    const lastRecord = printerRecords[0]; // 最近一天的记录
    const dailyIncrement = lastRecord 
      ? result.counter - lastRecord.total_counter 
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
      waste_count: existingIndex >= 0 ? (records[existingIndex].waste_count || 0) : 0,
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
          waste_count: existingIndex >= 0 ? (records[existingIndex].waste_count || 0) : 0,
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

// ============================================
// IPC 处理器 - 云端数据 (Turso)
// ============================================

/**
 * 获取云端打印机列表（从 printer_logs 表去重）
 */
ipcMain.handle('get-cloud-printers', async () => {
  try {
    const printers = await getPrintersFromDB();
    return { success: true, data: printers };
  } catch (error: any) {
    console.error('获取云端打印机失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 获取云端打印记录
 */
ipcMain.handle('get-cloud-logs', async (_, machineName?: string, startDate?: string, endDate?: string) => {
  try {
    const logs = await getPrinterLogsFromDB(machineName, startDate, endDate);
    return { success: true, data: logs };
  } catch (error: any) {
    console.error('获取云端打印记录失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 获取云端每日打印统计
 */
ipcMain.handle('get-cloud-daily-stats', async (_, startDate: string, endDate: string) => {
  try {
    const logs = await getDailyPrintCounts(startDate, endDate);
    return { success: true, data: logs };
  } catch (error: any) {
    console.error('获取云端每日统计失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 测试云端数据库连接
 */
ipcMain.handle('test-cloud-connection', async () => {
  try {
    initDatabase();
    const printers = await getPrintersFromDB();
    return { success: true, message: `连接成功，发现 ${printers.length} 台打印机` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 应用退出时关闭数据库连接
app.on('will-quit', () => {
  closeDatabase();
});

// ============================================
// IPC 处理器 - 云端打印机 CRUD (printers 表)
// ============================================

/**
 * 获取所有云端打印机配置
 */
ipcMain.handle('get-cloud-printer-configs', async () => {
  try {
    const printers = await getAllPrinters();
    return { success: true, data: printers };
  } catch (error: any) {
    console.error('获取云端打印机配置失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 添加云端打印机 - 根据 IP 是否存在于 printer_logs 决定状态
 */
ipcMain.handle('add-cloud-printer', async (_, printerData: Omit<DBPrinter, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    // 检查 IP 是否存在于 printer_logs 中
    const ipCheck = await checkIPExistsInLogs(printerData.machine_ip);
    
    // 如果 IP 存在于 printer_logs，状态为 online，否则为 offline
    const status = ipCheck.exists ? 'online' : 'offline';
    
    const printer = await dbAddPrinter({
      ...printerData,
      status,
    });
    return { success: true, data: printer };
  } catch (error: any) {
    console.error('添加云端打印机失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 更新云端打印机
 */
ipcMain.handle('update-cloud-printer', async (_, id: number, printerData: Partial<DBPrinter>) => {
  try {
    const printer = await dbUpdatePrinter(id, printerData);
    return { success: true, data: printer };
  } catch (error: any) {
    console.error('更新云端打印机失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 删除云端打印机
 */
ipcMain.handle('delete-cloud-printer', async (_, id: number) => {
  try {
    const result = await dbDeletePrinter(id);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('删除云端打印机失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 检查 IP 是否存在于 printer_logs 中
 */
ipcMain.handle('check-ip-exists', async (_, machineIP: string) => {
  try {
    const result = await checkIPExistsInLogs(machineIP);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * 获取所有打印机的统计数据
 */
ipcMain.handle('get-all-printer-stats', async () => {
  try {
    const stats = await getAllPrinterStats();
    return { success: true, data: stats };
  } catch (error: any) {
    console.error('获取打印机统计失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 一键添加 printer_logs 表中的所有打印机
 */
ipcMain.handle('auto-add-printers-from-logs', async () => {
  try {
    // 获取 printer_logs 中所有唯一的打印机
    const uniquePrinters = await getUniquePrintersFromLogs();
    
    // 获取已存在的打印机
    const existingPrinters = await getAllPrinters();
    const existingIPs = new Set(existingPrinters.map(p => p.machine_ip));
    
    // 过滤出未添加的打印机
    const newPrinters = uniquePrinters.filter(p => !existingIPs.has(p.machine_ip));
    
    if (newPrinters.length === 0) {
      return { success: true, added: 0, message: '所有打印机已存在，无需添加' };
    }
    
    // 批量添加
    let addedCount = 0;
    for (const printer of newPrinters) {
      await dbAddPrinter({
        machine_name: printer.machine_name,
        machine_ip: printer.machine_ip,
        printer_type: 'mono', // 默认黑白机
        cost_per_page: 0.05,
        price_per_page: 0.5,
        scrape_url: null,
        status: 'online', // 因为在 logs 中存在，所以是在线
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

/**
 * 获取云端月度营收数据
 */
ipcMain.handle('get-cloud-monthly-revenue', async (_, year: number, month: number) => {
  try {
    const data = await getCloudMonthlyRevenueData(year, month);
    return { success: true, data };
  } catch (error: any) {
    console.error('获取云端月度营收失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 添加云端其他收入
 */
ipcMain.handle('add-cloud-other-revenue', async (_, data: { date: string; amount: number; description: string; category: string }) => {
  try {
    await addCloudOtherRevenue(data);
    return { success: true };
  } catch (error: any) {
    console.error('添加云端其他收入失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 更新损耗记录
 */
ipcMain.handle('update-cloud-waste', async (_, machineIP: string, wasteDate: string, wasteCount: number) => {
  try {
    await updateWasteRecord(machineIP, wasteDate, wasteCount);
    return { success: true };
  } catch (error: any) {
    console.error('更新损耗记录失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 获取月租金
 */
ipcMain.handle('get-monthly-rent', async () => {
  try {
    const rent = await getMonthlyRent();
    return { success: true, data: rent };
  } catch (error: any) {
    console.error('获取月租金失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 更新月租金
 */
ipcMain.handle('update-monthly-rent', async (_, rent: number) => {
  try {
    await updateMonthlyRent(rent);
    return { success: true };
  } catch (error: any) {
    console.error('更新月租金失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 获取看板统计数据 (云端)
 */
ipcMain.handle('get-dashboard-stats', async (_, startDate: string, endDate: string, prevStartDate: string, prevEndDate: string) => {
  try {
    const data = await getDashboardStats(startDate, endDate, prevStartDate, prevEndDate);
    return { success: true, data };
  } catch (error: any) {
    console.error('获取看板统计数据失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 获取看板图表数据 (云端)
 */
ipcMain.handle('get-dashboard-chart', async (_, dates: string[]) => {
  try {
    const data = await getDashboardChartData(dates);
    return { success: true, data };
  } catch (error: any) {
    console.error('获取看板图表数据失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 获取看板饼图数据 (云端)
 */
ipcMain.handle('get-dashboard-pie', async (_, startDate: string, endDate: string) => {
  try {
    const data = await getDashboardPieData(startDate, endDate);
    return { success: true, data };
  } catch (error: any) {
    console.error('获取看板饼图数据失败:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 同步打印机数据
 */
ipcMain.handle('sync-printer-data', async () => {
  try {
    const result = await syncAllPrinterData();
    return { success: true, data: result };
  } catch (error: any) {
    console.error('同步打印机数据失败:', error);
    return { success: false, error: error.message };
  }
});
