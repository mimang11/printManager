/**
 * ============================================
 * Turso 数据库连接模块
 * ============================================
 * 使用 @libsql/client 连接 Turso 云端数据库
 * 
 * 数据库表结构见 DATABASE_SCHEMA.md
 */

import { createClient, Client } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

let client: Client | null = null;

/**
 * 从 .env 文件读取环境变量
 */
function loadEnvFile(): { url: string; authToken: string } {
  const possiblePaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '../../../.env'),
    path.join(__dirname, '../../.env'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      const env: Record<string, string> = {};
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim();
          }
        }
      }
      
      return {
        url: env['TURSO_DATABASE_URL'] || '',
        authToken: env['TURSO_AUTH_TOKEN'] || '',
      };
    }
  }
  
  return { url: '', authToken: '' };
}

/**
 * 初始化数据库连接
 */
export function initDatabase(): Client {
  if (client) return client;

  const { url, authToken } = loadEnvFile();

  if (!url || !authToken) {
    throw new Error('请在 .env 文件中配置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN');
  }

  client = createClient({ url, authToken });
  return client;
}

/**
 * 获取数据库客户端
 */
export function getDatabase(): Client {
  if (!client) {
    return initDatabase();
  }
  return client;
}

// ============================================
// 类型定义
// ============================================

/** 打印机配置 (对应 printers 表) */
export interface DBPrinter {
  id: number;
  machine_name: string;
  machine_ip: string;
  printer_type: 'mono' | 'color';
  cost_per_page: number;
  price_per_page: number;
  status: 'online' | 'offline' | 'error';
  created_at: string;
  updated_at: string;
}

/** 打印日志 (对应 printer_logs 表) */
export interface DBPrinterLog {
  id: number;
  machine_name: string;
  machine_ip: string;
  print_count: number;
  log_date: string;
  created_at: string;
}

/** 其他收入 (对应 other_revenues 表) */
export interface DBOtherRevenue {
  id: number;
  revenue_date: string;
  amount: number;
  description: string;
  category: string;
  created_at: string;
}

// ============================================
// Printers 表操作
// ============================================

/** 获取所有打印机配置 */
export async function getAllPrinters(): Promise<DBPrinter[]> {
  const db = getDatabase();
  const result = await db.execute('SELECT * FROM printers ORDER BY machine_name');
  
  return result.rows.map(row => ({
    id: row.id as number,
    machine_name: row.machine_name as string,
    machine_ip: row.machine_ip as string,
    printer_type: (row.printer_type as 'mono' | 'color') || 'mono',
    cost_per_page: row.cost_per_page as number,
    price_per_page: row.price_per_page as number,
    status: (row.status as 'online' | 'offline' | 'error') || 'offline',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }));
}

/** 根据名称获取打印机 */
export async function getPrinterByName(machineName: string): Promise<DBPrinter | null> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM printers WHERE machine_name = ?',
    args: [machineName],
  });
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id as number,
    machine_name: row.machine_name as string,
    machine_ip: row.machine_ip as string,
    printer_type: (row.printer_type as 'mono' | 'color') || 'mono',
    cost_per_page: row.cost_per_page as number,
    price_per_page: row.price_per_page as number,
    status: (row.status as 'online' | 'offline' | 'error') || 'offline',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** 添加打印机 */
export async function addPrinter(printer: Omit<DBPrinter, 'id' | 'created_at' | 'updated_at'>): Promise<DBPrinter> {
  const db = getDatabase();
  const result = await db.execute({
    sql: `INSERT INTO printers (machine_name, machine_ip, printer_type, cost_per_page, price_per_page, status)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      printer.machine_name,
      printer.machine_ip,
      printer.printer_type,
      printer.cost_per_page,
      printer.price_per_page,
      printer.status || 'offline',
    ],
  });
  
  const inserted = await getPrinterByName(printer.machine_name);
  return inserted!;
}

/** 更新打印机 */
export async function updatePrinter(id: number, printer: Partial<Omit<DBPrinter, 'id' | 'created_at'>>): Promise<DBPrinter | null> {
  const db = getDatabase();
  const fields: string[] = [];
  const args: any[] = [];
  
  if (printer.machine_name !== undefined) { fields.push('machine_name = ?'); args.push(printer.machine_name); }
  if (printer.machine_ip !== undefined) { fields.push('machine_ip = ?'); args.push(printer.machine_ip); }
  if (printer.printer_type !== undefined) { fields.push('printer_type = ?'); args.push(printer.printer_type); }
  if (printer.cost_per_page !== undefined) { fields.push('cost_per_page = ?'); args.push(printer.cost_per_page); }
  if (printer.price_per_page !== undefined) { fields.push('price_per_page = ?'); args.push(printer.price_per_page); }
  if (printer.status !== undefined) { fields.push('status = ?'); args.push(printer.status); }
  
  if (fields.length === 0) return null;
  
  fields.push("updated_at = datetime('now')");
  args.push(id);
  
  await db.execute({
    sql: `UPDATE printers SET ${fields.join(', ')} WHERE id = ?`,
    args,
  });
  
  const result = await db.execute({ sql: 'SELECT * FROM printers WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id as number,
    machine_name: row.machine_name as string,
    machine_ip: row.machine_ip as string,
    printer_type: (row.printer_type as 'mono' | 'color') || 'mono',
    cost_per_page: row.cost_per_page as number,
    price_per_page: row.price_per_page as number,
    status: (row.status as 'online' | 'offline' | 'error') || 'offline',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** 删除打印机 */
export async function deletePrinter(id: number): Promise<boolean> {
  const db = getDatabase();
  const result = await db.execute({ sql: 'DELETE FROM printers WHERE id = ?', args: [id] });
  return result.rowsAffected > 0;
}

// ============================================
// Printer Logs 表操作
// ============================================

/** 从 printer_logs 获取打印机列表（去重） */
export async function getPrintersFromDB(): Promise<{ machine_name: string; machine_ip: string }[]> {
  const db = getDatabase();
  const result = await db.execute(`
    SELECT DISTINCT machine_name, machine_ip FROM printer_logs ORDER BY machine_name
  `);
  return result.rows.map(row => ({
    machine_name: row.machine_name as string,
    machine_ip: row.machine_ip as string,
  }));
}

/** 获取打印记录 */
export async function getPrinterLogsFromDB(
  machineName?: string, startDate?: string, endDate?: string
): Promise<DBPrinterLog[]> {
  const db = getDatabase();
  let sql = 'SELECT * FROM printer_logs WHERE 1=1';
  const args: any[] = [];
  
  if (machineName) { sql += ' AND machine_name = ?'; args.push(machineName); }
  if (startDate) { sql += ' AND log_date >= ?'; args.push(startDate); }
  if (endDate) { sql += ' AND log_date <= ?'; args.push(endDate); }
  sql += ' ORDER BY log_date DESC, machine_name';
  
  const result = await db.execute({ sql, args });
  return result.rows.map(row => ({
    id: row.id as number,
    machine_name: row.machine_name as string,
    machine_ip: row.machine_ip as string,
    print_count: row.print_count as number,
    log_date: row.log_date as string,
    created_at: row.created_at as string,
  }));
}

/** 获取日期范围内的打印数据 */
export async function getDailyPrintCounts(startDate: string, endDate: string): Promise<DBPrinterLog[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM printer_logs WHERE log_date >= ? AND log_date <= ? ORDER BY log_date, machine_name',
    args: [startDate, endDate],
  });
  return result.rows.map(row => ({
    id: row.id as number,
    machine_name: row.machine_name as string,
    machine_ip: row.machine_ip as string,
    print_count: row.print_count as number,
    log_date: row.log_date as string,
    created_at: row.created_at as string,
  }));
}

/** 关闭数据库连接 */
export function closeDatabase(): void {
  if (client) { client.close(); client = null; }
}

// ============================================
// 打印机与日志关联查询 (通过 IP 地址)
// ============================================

/** 根据 IP 地址获取打印机配置 */
export async function getPrinterByIP(machineIP: string): Promise<DBPrinter | null> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM printers WHERE machine_ip = ?',
    args: [machineIP],
  });
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id as number,
    machine_name: row.machine_name as string,
    machine_ip: row.machine_ip as string,
    printer_type: (row.printer_type as 'mono' | 'color') || 'mono',
    cost_per_page: row.cost_per_page as number,
    price_per_page: row.price_per_page as number,
    status: (row.status as 'online' | 'offline' | 'error') || 'offline',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** 打印机统计数据 */
export interface PrinterStats {
  printer: DBPrinter;
  total_prints: number;      // 总打印量
  today_prints: number;      // 今日打印量
  month_prints: number;      // 本月打印量
  total_cost: number;        // 总成本
  total_revenue: number;     // 总收入
  total_profit: number;      // 总利润
  today_revenue: number;     // 今日收入
  today_cost: number;        // 今日成本
  today_profit: number;      // 今日利润
  month_revenue: number;     // 本月收入
  month_cost: number;        // 本月成本
  month_profit: number;      // 本月利润
}

/** 获取打印机统计数据 (通过 IP 关联 printer_logs) */
export async function getPrinterStats(printerId: number): Promise<PrinterStats | null> {
  const db = getDatabase();
  
  // 获取打印机配置
  const printerResult = await db.execute({ sql: 'SELECT * FROM printers WHERE id = ?', args: [printerId] });
  if (printerResult.rows.length === 0) return null;
  
  const row = printerResult.rows[0];
  const printer: DBPrinter = {
    id: row.id as number,
    machine_name: row.machine_name as string,
    machine_ip: row.machine_ip as string,
    printer_type: (row.printer_type as 'mono' | 'color') || 'mono',
    cost_per_page: row.cost_per_page as number,
    price_per_page: row.price_per_page as number,
    status: (row.status as 'online' | 'offline' | 'error') || 'offline',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
  
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.substring(0, 7) + '-01';
  
  // 通过 IP 地址查询关联的打印日志 - 总打印量
  const totalResult = await db.execute({
    sql: 'SELECT COALESCE(SUM(print_count), 0) as total FROM printer_logs WHERE machine_ip = ?',
    args: [printer.machine_ip],
  });
  const total_prints = Number(totalResult.rows[0]?.total) || 0;
  
  // 今日打印量
  const todayResult = await db.execute({
    sql: 'SELECT COALESCE(SUM(print_count), 0) as total FROM printer_logs WHERE machine_ip = ? AND log_date = ?',
    args: [printer.machine_ip, today],
  });
  const today_prints = Number(todayResult.rows[0]?.total) || 0;
  
  // 本月打印量
  const monthResult = await db.execute({
    sql: 'SELECT COALESCE(SUM(print_count), 0) as total FROM printer_logs WHERE machine_ip = ? AND log_date >= ?',
    args: [printer.machine_ip, monthStart],
  });
  const month_prints = Number(monthResult.rows[0]?.total) || 0;
  
  // 计算成本、收入、利润
  const cost_per_page = printer.cost_per_page;
  const price_per_page = printer.price_per_page;
  
  return {
    printer,
    total_prints,
    today_prints,
    month_prints,
    total_cost: total_prints * cost_per_page,
    total_revenue: total_prints * price_per_page,
    total_profit: total_prints * (price_per_page - cost_per_page),
    today_cost: today_prints * cost_per_page,
    today_revenue: today_prints * price_per_page,
    today_profit: today_prints * (price_per_page - cost_per_page),
    month_cost: month_prints * cost_per_page,
    month_revenue: month_prints * price_per_page,
    month_profit: month_prints * (price_per_page - cost_per_page),
  };
}

/** 获取所有打印机的统计数据 */
export async function getAllPrinterStats(): Promise<PrinterStats[]> {
  const printers = await getAllPrinters();
  const stats: PrinterStats[] = [];
  
  for (const printer of printers) {
    const stat = await getPrinterStats(printer.id);
    if (stat) stats.push(stat);
  }
  
  return stats;
}

/** 检查 IP 是否已存在于 printer_logs 中 */
export async function checkIPExistsInLogs(machineIP: string): Promise<{ exists: boolean; machine_name?: string }> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT DISTINCT machine_name FROM printer_logs WHERE machine_ip = ? LIMIT 1',
    args: [machineIP],
  });
  
  if (result.rows.length > 0) {
    return { exists: true, machine_name: result.rows[0].machine_name as string };
  }
  return { exists: false };
}

/** 获取 printer_logs 中所有唯一的打印机 (用于一键添加) */
export async function getUniquePrintersFromLogs(): Promise<{ machine_name: string; machine_ip: string }[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT DISTINCT machine_name, machine_ip FROM printer_logs ORDER BY machine_name',
    args: [],
  });
  
  return result.rows.map(row => ({
    machine_name: row.machine_name as string,
    machine_ip: row.machine_ip as string,
  }));
}

/** 获取指定日期范围内的打印统计 (按打印机 IP 分组) */
export async function getPrintStatsByDateRange(startDate: string, endDate: string): Promise<{
  machine_ip: string;
  machine_name: string;
  total_prints: number;
  printer_config?: DBPrinter;
  revenue: number;
  cost: number;
  profit: number;
}[]> {
  const db = getDatabase();
  
  // 获取日期范围内的打印数据，按 IP 分组
  const logsResult = await db.execute({
    sql: `SELECT machine_ip, machine_name, SUM(print_count) as total_prints 
          FROM printer_logs 
          WHERE log_date >= ? AND log_date <= ? 
          GROUP BY machine_ip`,
    args: [startDate, endDate],
  });
  
  const stats = [];
  for (const row of logsResult.rows) {
    const machine_ip = row.machine_ip as string;
    const machine_name = row.machine_name as string;
    const total_prints = Number(row.total_prints) || 0;
    
    // 查找对应的打印机配置
    const printer = await getPrinterByIP(machine_ip);
    
    const cost_per_page = printer?.cost_per_page || 0.05;
    const price_per_page = printer?.price_per_page || 0.5;
    
    stats.push({
      machine_ip,
      machine_name,
      total_prints,
      printer_config: printer || undefined,
      revenue: total_prints * price_per_page,
      cost: total_prints * cost_per_page,
      profit: total_prints * (price_per_page - cost_per_page),
    });
  }
  
  return stats;
}

// ============================================
// 营收管理相关函数
// ============================================

/** 云端月度营收数据 */
export interface CloudMonthlyRevenueData {
  date: string;
  printers: {
    printerId: string;
    printerName: string;
    count: number;        // 实际打印量 (当天累计 - 前一天累计)
    wasteCount: number;   // 损耗数量
    revenue: number;      // 营收 (有效印量 * 售价)
    cost: number;         // 成本 (物理印量 * 成本)
    profit: number;
  }[];
  otherIncome: number;
  otherIncomeNote: string;
  netProfit: number;
  rent: number;
}

/** 获取月度营收数据 (从云端) - 打印量为累计值差值 */
export async function getCloudMonthlyRevenueData(year: number, month: number): Promise<CloudMonthlyRevenueData[]> {
  const db = getDatabase();
  
  // 构建日期范围 (需要获取前一天的数据来计算差值)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  // 计算前一天日期
  const prevDate = new Date(year, month - 1, 0); // 上个月最后一天
  const prevDateStr = prevDate.toISOString().split('T')[0];
  
  // 获取所有打印机配置
  const printers = await getAllPrinters();
  const printerMap = new Map(printers.map(p => [p.machine_ip, p]));
  
  // 获取日期范围内的打印日志 (包含前一天)
  const logsResult = await db.execute({
    sql: `SELECT log_date, machine_ip, machine_name, print_count 
          FROM printer_logs 
          WHERE log_date >= ? AND log_date <= ? 
          ORDER BY machine_ip, log_date`,
    args: [prevDateStr, endDate],
  });
  
  // 获取损耗记录
  const wasteResult = await db.execute({
    sql: `SELECT machine_ip, waste_date, waste_count FROM waste_records WHERE waste_date >= ? AND waste_date <= ?`,
    args: [startDate, endDate],
  });
  
  // 构建损耗映射 (machine_ip + date -> waste_count)
  const wasteMap = new Map<string, number>();
  for (const row of wasteResult.rows) {
    const key = `${row.machine_ip}_${row.waste_date}`;
    wasteMap.set(key, row.waste_count as number);
  }
  
  // 获取其他收入
  const otherResult = await db.execute({
    sql: `SELECT revenue_date, amount, description FROM other_revenues WHERE revenue_date >= ? AND revenue_date <= ?`,
    args: [startDate, endDate],
  });
  
  // 按日期分组其他收入
  const otherIncomeMap = new Map<string, { amount: number; note: string }>();
  for (const row of otherResult.rows) {
    const date = row.revenue_date as string;
    const existing = otherIncomeMap.get(date) || { amount: 0, note: '' };
    existing.amount += row.amount as number;
    if (row.description) {
      existing.note = existing.note ? `${existing.note}; ${row.description}` : row.description as string;
    }
    otherIncomeMap.set(date, existing);
  }
  
  // 按打印机分组日志，计算每天的实际打印量
  const machineLogsMap = new Map<string, Map<string, { name: string; count: number }>>();
  for (const row of logsResult.rows) {
    const machine_ip = row.machine_ip as string;
    const log_date = row.log_date as string;
    const machine_name = row.machine_name as string;
    const print_count = row.print_count as number;
    
    if (!machineLogsMap.has(machine_ip)) {
      machineLogsMap.set(machine_ip, new Map());
    }
    machineLogsMap.get(machine_ip)!.set(log_date, { name: machine_name, count: print_count });
  }
  
  // 构建每日数据
  const dailyData = new Map<string, CloudMonthlyRevenueData>();
  
  // 遍历每台打印机，计算每天的实际打印量
  for (const [machine_ip, dateLogs] of machineLogsMap) {
    const sortedDates = Array.from(dateLogs.keys()).sort();
    const printer = printerMap.get(machine_ip);
    const cost_per_page = printer?.cost_per_page || 0.05;
    const price_per_page = printer?.price_per_page || 0.5;
    
    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      if (date < startDate) continue; // 跳过前一天的数据
      
      const currentLog = dateLogs.get(date)!;
      const prevLog = i > 0 ? dateLogs.get(sortedDates[i - 1]) : null;
      
      // 实际打印量 = 当天累计 - 前一天累计
      const actualCount = prevLog ? Math.max(0, currentLog.count - prevLog.count) : currentLog.count;
      
      // 获取损耗
      const wasteKey = `${machine_ip}_${date}`;
      const wasteCount = wasteMap.get(wasteKey) || 0;
      
      // 有效印量 = 实际打印量 - 损耗
      const effectiveCount = Math.max(0, actualCount - wasteCount);
      
      // 营收按有效印量计算，成本按物理印量计算
      const revenue = effectiveCount * price_per_page;
      const cost = actualCount * cost_per_page;
      const profit = revenue - cost;
      
      if (!dailyData.has(date)) {
        const otherInfo = otherIncomeMap.get(date) || { amount: 0, note: '' };
        dailyData.set(date, {
          date, printers: [], otherIncome: otherInfo.amount,
          otherIncomeNote: otherInfo.note, netProfit: 0, rent: 0,
        });
      }
      
      dailyData.get(date)!.printers.push({
        printerId: machine_ip, printerName: currentLog.name,
        count: actualCount, wasteCount, revenue, cost, profit,
      });
    }
  }
  
  // 计算每日净利润
  for (const [, dayData] of dailyData) {
    const totalRevenue = dayData.printers.reduce((sum, p) => sum + p.revenue, 0);
    const totalCost = dayData.printers.reduce((sum, p) => sum + p.cost, 0);
    dayData.netProfit = totalRevenue - totalCost + dayData.otherIncome;
  }
  
  return Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** 更新损耗记录 */
export async function updateWasteRecord(machineIP: string, wasteDate: string, wasteCount: number): Promise<void> {
  const db = getDatabase();
  await db.execute({
    sql: `INSERT INTO waste_records (machine_ip, waste_date, waste_count) VALUES (?, ?, ?)
          ON CONFLICT(machine_ip, waste_date) DO UPDATE SET waste_count = ?`,
    args: [machineIP, wasteDate, wasteCount, wasteCount],
  });
}

/** 添加其他收入 (云端) */
export async function addCloudOtherRevenue(data: { date: string; amount: number; description: string; category: string }): Promise<void> {
  const db = getDatabase();
  await db.execute({
    sql: `INSERT INTO other_revenues (revenue_date, amount, description, category) VALUES (?, ?, ?, ?)`,
    args: [data.date, data.amount, data.description, data.category],
  });
}

/** 删除其他收入 (云端) */
export async function deleteCloudOtherRevenue(id: number): Promise<void> {
  const db = getDatabase();
  await db.execute({ sql: 'DELETE FROM other_revenues WHERE id = ?', args: [id] });
}

// ============================================
// 系统设置相关函数
// ============================================

/** 获取设置值 */
export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT setting_value FROM settings WHERE setting_key = ?',
    args: [key],
  });
  if (result.rows.length > 0) {
    return result.rows[0].setting_value as string;
  }
  return defaultValue;
}

/** 更新设置值 */
export async function updateSetting(key: string, value: string): Promise<void> {
  const db = getDatabase();
  await db.execute({
    sql: `INSERT INTO settings (setting_key, setting_value, updated_at) VALUES (?, ?, datetime('now'))
          ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = datetime('now')`,
    args: [key, value, value],
  });
}

/** 获取月租金 */
export async function getMonthlyRent(): Promise<number> {
  const value = await getSetting('monthly_rent', '150');
  return parseFloat(value) || 150;
}

/** 更新月租金 */
export async function updateMonthlyRent(rent: number): Promise<void> {
  await updateSetting('monthly_rent', rent.toString());
}

// ============================================
// 看板数据相关函数
// ============================================

/** 看板统计数据 */
export interface DashboardStatsData {
  totalCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  prevCount: number;
  prevRevenue: number;
  countChange: number;
  revenueChange: number;
}

/** 看板图表数据点 */
export interface DashboardChartPoint {
  date: string;
  count: number;
  [printerName: string]: string | number;
}

/** 看板饼图数据 */
export interface DashboardPieData {
  name: string;
  value: number;
  percentage: number;
}

/** 获取看板统计数据 (云端) */
export async function getDashboardStats(startDate: string, endDate: string, prevStartDate: string, prevEndDate: string): Promise<DashboardStatsData> {
  const db = getDatabase();
  const printers = await getAllPrinters();
  const printerMap = new Map(printers.map(p => [p.machine_ip, p]));
  
  // 获取当前周期数据
  const currentResult = await db.execute({
    sql: `SELECT machine_ip, log_date, print_count FROM printer_logs WHERE log_date >= ? AND log_date <= ? ORDER BY machine_ip, log_date`,
    args: [startDate, endDate],
  });
  
  // 获取前一周期数据
  const prevResult = await db.execute({
    sql: `SELECT machine_ip, log_date, print_count FROM printer_logs WHERE log_date >= ? AND log_date <= ? ORDER BY machine_ip, log_date`,
    args: [prevStartDate, prevEndDate],
  });
  
  // 计算实际打印量 (累计差值)
  const calcPrints = (rows: any[]) => {
    const ipDateMap = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const ip = row.machine_ip as string;
      const date = row.log_date as string;
      const count = Number(row.print_count) || 0;
      if (!ipDateMap.has(ip)) ipDateMap.set(ip, new Map());
      ipDateMap.get(ip)!.set(date, count);
    }
    
    let totalCount = 0, totalRevenue = 0, totalCost = 0;
    for (const [ip, dateMap] of ipDateMap) {
      const dates = Array.from(dateMap.keys()).sort();
      const printer = printerMap.get(ip);
      const price = printer?.price_per_page || 0.5;
      const cost = printer?.cost_per_page || 0.05;
      
      for (let i = 0; i < dates.length; i++) {
        const curr = dateMap.get(dates[i]) || 0;
        const prev = i > 0 ? (dateMap.get(dates[i - 1]) || 0) : 0;
        const dailyPrints = Math.max(0, curr - prev);
        totalCount += dailyPrints;
        totalRevenue += dailyPrints * price;
        totalCost += dailyPrints * cost;
      }
    }
    return { totalCount, totalRevenue, totalCost };
  };
  
  const current = calcPrints(currentResult.rows);
  const prev = calcPrints(prevResult.rows);
  
  const countChange = prev.totalCount > 0 ? ((current.totalCount - prev.totalCount) / prev.totalCount) * 100 : 0;
  const revenueChange = prev.totalRevenue > 0 ? ((current.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100 : 0;
  
  return {
    totalCount: current.totalCount,
    totalRevenue: Math.round(current.totalRevenue * 100) / 100,
    totalCost: Math.round(current.totalCost * 100) / 100,
    totalProfit: Math.round((current.totalRevenue - current.totalCost) * 100) / 100,
    prevCount: prev.totalCount,
    prevRevenue: Math.round(prev.totalRevenue * 100) / 100,
    countChange: Math.round(countChange * 10) / 10,
    revenueChange: Math.round(revenueChange * 10) / 10,
  };
}

/** 获取看板图表数据 (云端) */
export async function getDashboardChartData(dates: string[]): Promise<DashboardChartPoint[]> {
  const db = getDatabase();
  const printers = await getAllPrinters();
  
  const result: DashboardChartPoint[] = [];
  
  for (const date of dates) {
    // 获取前一天日期
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    
    // 获取当天和前一天的数据
    const logsResult = await db.execute({
      sql: `SELECT machine_ip, machine_name, log_date, print_count FROM printer_logs WHERE log_date IN (?, ?) ORDER BY machine_ip`,
      args: [prevDateStr, date],
    });
    
    const dataPoint: DashboardChartPoint = { date: date.slice(5), count: 0 };
    
    // 按 IP 分组计算
    const ipMap = new Map<string, { prev: number; curr: number; name: string }>();
    for (const row of logsResult.rows) {
      const ip = row.machine_ip as string;
      const logDate = row.log_date as string;
      const count = Number(row.print_count) || 0;
      const name = row.machine_name as string;
      
      if (!ipMap.has(ip)) ipMap.set(ip, { prev: 0, curr: 0, name });
      const entry = ipMap.get(ip)!;
      if (logDate === prevDateStr) entry.prev = count;
      else if (logDate === date) entry.curr = count;
    }
    
    // 计算每台打印机的实际打印量
    for (const [ip, data] of ipMap) {
      const dailyPrints = Math.max(0, data.curr - data.prev);
      dataPoint.count += dailyPrints;
      
      // 查找打印机配置获取名称
      const printer = printers.find(p => p.machine_ip === ip);
      const name = printer?.machine_name || data.name;
      dataPoint[name] = (dataPoint[name] as number || 0) + dailyPrints;
    }
    
    result.push(dataPoint);
  }
  
  return result;
}

/** 获取看板饼图数据 (云端) */
export async function getDashboardPieData(startDate: string, endDate: string): Promise<DashboardPieData[]> {
  const db = getDatabase();
  const printers = await getAllPrinters();
  
  // 获取日期范围内的数据
  const logsResult = await db.execute({
    sql: `SELECT machine_ip, machine_name, log_date, print_count FROM printer_logs WHERE log_date >= ? AND log_date <= ? ORDER BY machine_ip, log_date`,
    args: [startDate, endDate],
  });
  
  // 按 IP 分组计算实际打印量
  const ipTotals = new Map<string, { total: number; name: string }>();
  const ipDateMap = new Map<string, Map<string, number>>();
  
  for (const row of logsResult.rows) {
    const ip = row.machine_ip as string;
    const date = row.log_date as string;
    const count = Number(row.print_count) || 0;
    const name = row.machine_name as string;
    
    if (!ipDateMap.has(ip)) {
      ipDateMap.set(ip, new Map());
      ipTotals.set(ip, { total: 0, name });
    }
    ipDateMap.get(ip)!.set(date, count);
  }
  
  // 计算每台打印机的实际打印量
  for (const [ip, dateMap] of ipDateMap) {
    const dates = Array.from(dateMap.keys()).sort();
    let total = 0;
    for (let i = 0; i < dates.length; i++) {
      const curr = dateMap.get(dates[i]) || 0;
      const prev = i > 0 ? (dateMap.get(dates[i - 1]) || 0) : 0;
      total += Math.max(0, curr - prev);
    }
    ipTotals.get(ip)!.total = total;
  }
  
  // 转换为饼图数据
  const grandTotal = Array.from(ipTotals.values()).reduce((sum, v) => sum + v.total, 0);
  const pieData: DashboardPieData[] = [];
  
  for (const [ip, data] of ipTotals) {
    if (data.total > 0) {
      const printer = printers.find(p => p.machine_ip === ip);
      const name = printer?.machine_name || data.name;
      pieData.push({
        name: name,
        value: data.total,
        percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 1000) / 10 : 0,
      });
    }
  }
  
  return pieData.sort((a, b) => b.value - a.value);
}
