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
  scrape_url: string | null;
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
    scrape_url: (row.scrape_url as string) || null,
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
    scrape_url: (row.scrape_url as string) || null,
    status: (row.status as 'online' | 'offline' | 'error') || 'offline',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** 添加打印机 */
export async function addPrinter(printer: Omit<DBPrinter, 'id' | 'created_at' | 'updated_at'>): Promise<DBPrinter> {
  const db = getDatabase();
  const result = await db.execute({
    sql: `INSERT INTO printers (machine_name, machine_ip, printer_type, cost_per_page, price_per_page, scrape_url, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      printer.machine_name,
      printer.machine_ip,
      printer.printer_type,
      printer.cost_per_page,
      printer.price_per_page,
      printer.scrape_url || null,
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
  if (printer.scrape_url !== undefined) { fields.push('scrape_url = ?'); args.push(printer.scrape_url); }
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
    scrape_url: (row.scrape_url as string) || null,
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
    scrape_url: (row.scrape_url as string) || null,
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
    scrape_url: (row.scrape_url as string) || null,
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
  otherCost: number;
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
    sql: `SELECT revenue_date, amount, COALESCE(cost, 0) as cost, description FROM other_revenues WHERE revenue_date >= ? AND revenue_date <= ?`,
    args: [startDate, endDate],
  });
  
  // 按日期分组其他收入
  const otherIncomeMap = new Map<string, { amount: number; cost: number; note: string }>();
  for (const row of otherResult.rows) {
    const date = row.revenue_date as string;
    const existing = otherIncomeMap.get(date) || { amount: 0, cost: 0, note: '' };
    existing.amount += row.amount as number;
    existing.cost += row.cost as number;
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
        const otherInfo = otherIncomeMap.get(date) || { amount: 0, cost: 0, note: '' };
        dailyData.set(date, {
          date, printers: [], otherIncome: otherInfo.amount, otherCost: otherInfo.cost,
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
    dayData.netProfit = totalRevenue - totalCost + dayData.otherIncome - dayData.otherCost;
  }
  
  return Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** 更新损耗记录 (旧方法，保留兼容) */
export async function updateWasteRecord(machineIP: string, wasteDate: string, wasteCount: number): Promise<void> {
  const db = getDatabase();
  await db.execute({
    sql: `INSERT INTO waste_records (machine_ip, waste_date, waste_count) VALUES (?, ?, ?)
          ON CONFLICT(machine_ip, waste_date) DO UPDATE SET waste_count = ?`,
    args: [machineIP, wasteDate, wasteCount, wasteCount],
  });
}

/** 损耗记录详情 */
export interface WasteRecordDetail {
  id: number;
  machine_ip: string;
  waste_date: string;
  waste_count: number;
  note: string;
  operator: string;
  created_at: string;
}

/** 获取某天某打印机的所有损耗记录 */
export async function getWasteRecords(machineIP: string, wasteDate: string): Promise<WasteRecordDetail[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: `SELECT id, machine_ip, waste_date, waste_count, COALESCE(note, '') as note, COALESCE(operator, '') as operator, created_at 
          FROM waste_records_detail WHERE machine_ip = ? AND waste_date = ? ORDER BY created_at DESC`,
    args: [machineIP, wasteDate],
  });
  return result.rows.map(row => ({
    id: row.id as number,
    machine_ip: row.machine_ip as string,
    waste_date: row.waste_date as string,
    waste_count: row.waste_count as number,
    note: row.note as string,
    operator: row.operator as string,
    created_at: row.created_at as string,
  }));
}

/** 添加损耗记录 */
export async function addWasteRecord(data: { machineIP: string; wasteDate: string; wasteCount: number; note: string; operator: string }): Promise<WasteRecordDetail> {
  const db = getDatabase();
  await db.execute({
    sql: `INSERT INTO waste_records_detail (machine_ip, waste_date, waste_count, note, operator) VALUES (?, ?, ?, ?, ?)`,
    args: [data.machineIP, data.wasteDate, data.wasteCount, data.note, data.operator],
  });
  
  // 同步更新汇总表
  await syncWasteSummary(data.machineIP, data.wasteDate);
  
  // 返回最新插入的记录
  const result = await db.execute({
    sql: `SELECT id, machine_ip, waste_date, waste_count, note, operator, created_at FROM waste_records_detail 
          WHERE machine_ip = ? AND waste_date = ? ORDER BY id DESC LIMIT 1`,
    args: [data.machineIP, data.wasteDate],
  });
  const row = result.rows[0];
  return {
    id: row.id as number,
    machine_ip: row.machine_ip as string,
    waste_date: row.waste_date as string,
    waste_count: row.waste_count as number,
    note: row.note as string,
    operator: row.operator as string,
    created_at: row.created_at as string,
  };
}

/** 删除损耗记录 */
export async function deleteWasteRecord(id: number): Promise<{ machineIP: string; wasteDate: string }> {
  const db = getDatabase();
  // 先获取记录信息
  const record = await db.execute({ sql: 'SELECT machine_ip, waste_date FROM waste_records_detail WHERE id = ?', args: [id] });
  if (record.rows.length === 0) throw new Error('记录不存在');
  
  const machineIP = record.rows[0].machine_ip as string;
  const wasteDate = record.rows[0].waste_date as string;
  
  await db.execute({ sql: 'DELETE FROM waste_records_detail WHERE id = ?', args: [id] });
  
  // 同步更新汇总表
  await syncWasteSummary(machineIP, wasteDate);
  
  return { machineIP, wasteDate };
}

/** 同步损耗汇总表 */
async function syncWasteSummary(machineIP: string, wasteDate: string): Promise<void> {
  const db = getDatabase();
  // 计算该打印机该天的总损耗
  const sumResult = await db.execute({
    sql: 'SELECT COALESCE(SUM(waste_count), 0) as total FROM waste_records_detail WHERE machine_ip = ? AND waste_date = ?',
    args: [machineIP, wasteDate],
  });
  const totalWaste = Number(sumResult.rows[0]?.total) || 0;
  
  if (totalWaste > 0) {
    await db.execute({
      sql: `INSERT INTO waste_records (machine_ip, waste_date, waste_count) VALUES (?, ?, ?)
            ON CONFLICT(machine_ip, waste_date) DO UPDATE SET waste_count = ?`,
      args: [machineIP, wasteDate, totalWaste, totalWaste],
    });
  } else {
    await db.execute({
      sql: 'DELETE FROM waste_records WHERE machine_ip = ? AND waste_date = ?',
      args: [machineIP, wasteDate],
    });
  }
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
  // 收入明细
  printRevenue: number;
  otherIncome: number;
  // 成本明细
  printCost: number;
  otherCost: number;
  wasteCost: number;
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
  
  // 查找最近有数据的基准日期（往前最多找30天）
  const findBaseDate = async (targetDate: string): Promise<string> => {
    const d = new Date(targetDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const baseDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    // 检查前一天是否有数据
    const checkResult = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM printer_logs WHERE log_date = ?`,
      args: [baseDateStr],
    });
    
    if (Number(checkResult.rows[0]?.cnt) > 0) {
      return baseDateStr;
    }
    
    // 如果前一天没有数据，往前找最近有数据的日期（最多30天）
    const searchStart = new Date(targetDate + 'T00:00:00');
    searchStart.setDate(searchStart.getDate() - 30);
    const searchStartStr = `${searchStart.getFullYear()}-${String(searchStart.getMonth() + 1).padStart(2, '0')}-${String(searchStart.getDate()).padStart(2, '0')}`;
    
    const nearestResult = await db.execute({
      sql: `SELECT MAX(log_date) as nearest FROM printer_logs WHERE log_date >= ? AND log_date < ?`,
      args: [searchStartStr, targetDate],
    });
    
    const nearest = nearestResult.rows[0]?.nearest as string | null;
    return nearest || baseDateStr;
  };
  
  // 查找最近有数据的日期（用于环比对比）
  const findNearestDataDate = async (targetDate: string): Promise<string | null> => {
    // 检查目标日期是否有数据
    const checkResult = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM printer_logs WHERE log_date = ?`,
      args: [targetDate],
    });
    
    if (Number(checkResult.rows[0]?.cnt) > 0) {
      return targetDate;
    }
    
    // 如果目标日期没有数据，往前找最近有数据的日期（最多30天）
    const searchStart = new Date(targetDate + 'T00:00:00');
    searchStart.setDate(searchStart.getDate() - 30);
    const searchStartStr = `${searchStart.getFullYear()}-${String(searchStart.getMonth() + 1).padStart(2, '0')}-${String(searchStart.getDate()).padStart(2, '0')}`;
    
    const nearestResult = await db.execute({
      sql: `SELECT MAX(log_date) as nearest FROM printer_logs WHERE log_date >= ? AND log_date < ?`,
      args: [searchStartStr, targetDate],
    });
    
    return nearestResult.rows[0]?.nearest as string | null;
  };
  
  // 对于日视图，如果前一天没有数据，往前找有数据的日期
  let actualPrevStartDate = prevStartDate;
  let actualPrevEndDate = prevEndDate;
  let prevHasValidData = true; // 标记前一期是否有有效的环比数据
  
  // 判断是否是日视图（startDate == endDate）
  if (startDate === endDate) {
    const nearestPrevDate = await findNearestDataDate(prevStartDate);
    if (nearestPrevDate) {
      actualPrevStartDate = nearestPrevDate;
      actualPrevEndDate = nearestPrevDate;
      
      // 检查前一期的基准日期是否是前一期日期的前一天
      // 如果不是，说明中间有数据缺失，环比数据不准确
      const expectedPrevBaseDate = new Date(nearestPrevDate + 'T00:00:00');
      expectedPrevBaseDate.setDate(expectedPrevBaseDate.getDate() - 1);
      const expectedPrevBaseDateStr = `${expectedPrevBaseDate.getFullYear()}-${String(expectedPrevBaseDate.getMonth() + 1).padStart(2, '0')}-${String(expectedPrevBaseDate.getDate()).padStart(2, '0')}`;
      
      const checkPrevBase = await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM printer_logs WHERE log_date = ?`,
        args: [expectedPrevBaseDateStr],
      });
      
      if (Number(checkPrevBase.rows[0]?.cnt) === 0) {
        // 前一期的前一天没有数据，环比数据可能不准确
        // 但我们仍然尝试计算，只是要确保基准日期正确
        prevHasValidData = true; // 仍然计算，但使用找到的最近基准日期
      }
    } else {
      // 如果找不到任何有数据的日期，标记为无数据
      prevHasValidData = false;
    }
  }
  
  const currentBaseDate = await findBaseDate(startDate);
  const prevBaseDate = await findBaseDate(actualPrevStartDate);
  
  // 获取当前周期数据（包含基准日期）
  const currentResult = await db.execute({
    sql: `SELECT machine_ip, log_date, print_count FROM printer_logs WHERE log_date >= ? AND log_date <= ? ORDER BY machine_ip, log_date`,
    args: [currentBaseDate, endDate],
  });
  
  // 获取前一周期数据（包含基准日期）
  const prevResult = await db.execute({
    sql: `SELECT machine_ip, log_date, print_count FROM printer_logs WHERE log_date >= ? AND log_date <= ? ORDER BY machine_ip, log_date`,
    args: [prevBaseDate, actualPrevEndDate],
  });
  
  // 计算实际打印量 (累计差值)，baseDate 是基准日期（不计入统计，仅作为第一天的前一天）
  const calcPrints = (rows: any[], baseDate: string, actualStartDate: string) => {
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
        const currentDate = dates[i];
        // 跳过基准日期之前的数据，它只用于计算第一天的差值
        if (currentDate < actualStartDate) continue;
        
        const curr = dateMap.get(currentDate) || 0;
        // 找到前一个有数据的日期（可能不是连续的）
        const prev = i > 0 ? (dateMap.get(dates[i - 1]) || 0) : 0;
        const dailyPrints = Math.max(0, curr - prev);
        totalCount += dailyPrints;
        totalRevenue += dailyPrints * price;
        totalCost += dailyPrints * cost;
      }
    }
    return { totalCount, totalRevenue, totalCost };
  };
  
  const current = calcPrints(currentResult.rows, currentBaseDate, startDate);
  const prev = calcPrints(prevResult.rows, prevBaseDate, actualPrevStartDate);
  
  // 获取其他收入及其成本
  const currentOtherResult = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(cost), 0) as totalCost FROM other_revenues WHERE revenue_date >= ? AND revenue_date <= ?`,
    args: [startDate, endDate],
  });
  const prevOtherResult = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(cost), 0) as totalCost FROM other_revenues WHERE revenue_date >= ? AND revenue_date <= ?`,
    args: [actualPrevStartDate, actualPrevEndDate],
  });
  const currentOtherIncome = Number(currentOtherResult.rows[0]?.total) || 0;
  const currentOtherCost = Number(currentOtherResult.rows[0]?.totalCost) || 0;
  const prevOtherIncome = Number(prevOtherResult.rows[0]?.total) || 0;
  
  // 获取损耗数据
  const currentWasteResult = await db.execute({
    sql: `SELECT wr.machine_ip, SUM(wr.waste_count) as waste_count 
          FROM waste_records wr WHERE wr.waste_date >= ? AND wr.waste_date <= ? GROUP BY wr.machine_ip`,
    args: [startDate, endDate],
  });
  // 计算损耗金额
  let currentWasteCost = 0;
  for (const row of currentWasteResult.rows) {
    const ip = row.machine_ip as string;
    const wasteCount = Number(row.waste_count) || 0;
    const printer = printerMap.get(ip);
    const price = printer?.price_per_page || 0.5;
    currentWasteCost += wasteCount * price;
  }
  
  // 总营收 = 打印营收 + 其他收入
  const totalRevenue = current.totalRevenue + currentOtherIncome;
  const prevTotalRevenue = prev.totalRevenue + prevOtherIncome;
  
  // 总成本 = 打印成本 + 其他收入成本 + 损耗
  const totalCost = current.totalCost + currentOtherCost + currentWasteCost;
  
  // 计算环比变化 - 如果前一期没有数据，环比为0
  const countChange = (prevHasValidData && prev.totalCount > 0) ? ((current.totalCount - prev.totalCount) / prev.totalCount) * 100 : 0;
  const revenueChange = (prevHasValidData && prevTotalRevenue > 0) ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
  
  return {
    totalCount: current.totalCount,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalProfit: Math.round((totalRevenue - totalCost) * 100) / 100,
    prevCount: prev.totalCount,
    prevRevenue: Math.round(prevTotalRevenue * 100) / 100,
    countChange: Math.round(countChange * 10) / 10,
    revenueChange: Math.round(revenueChange * 10) / 10,
    // 收入明细
    printRevenue: Math.round(current.totalRevenue * 100) / 100,
    otherIncome: Math.round(currentOtherIncome * 100) / 100,
    // 成本明细
    printCost: Math.round(current.totalCost * 100) / 100,
    otherCost: Math.round(currentOtherCost * 100) / 100,
    wasteCost: Math.round(currentWasteCost * 100) / 100,
  };
}

/** 获取看板图表数据 (云端) */
export async function getDashboardChartData(dates: string[]): Promise<DashboardChartPoint[]> {
  const db = getDatabase();
  const printers = await getAllPrinters();
  
  const result: DashboardChartPoint[] = [];
  
  for (const dateParam of dates) {
    // 检查是否是日期范围格式 (YYYY-MM-DD~YYYY-MM-DD)
    if (dateParam.includes('~')) {
      // 月度汇总模式
      const [startDate, endDate] = dateParam.split('~');
      const month = startDate.slice(5, 7); // 提取月份用于显示
      
      // 获取月初前一天作为基准
      const baseDate = new Date(startDate);
      baseDate.setDate(baseDate.getDate() - 1);
      const baseDateStr = baseDate.toISOString().split('T')[0];
      
      // 获取基准日和月末的数据
      const logsResult = await db.execute({
        sql: `SELECT machine_ip, machine_name, log_date, print_count FROM printer_logs WHERE log_date IN (?, ?) ORDER BY machine_ip`,
        args: [baseDateStr, endDate],
      });
      
      const dataPoint: DashboardChartPoint = { date: `${parseInt(month)}月`, count: 0 };
      
      // 按 IP 分组计算
      const ipMap = new Map<string, { base: number; end: number; name: string }>();
      for (const row of logsResult.rows) {
        const ip = row.machine_ip as string;
        const logDate = row.log_date as string;
        const count = Number(row.print_count) || 0;
        const name = row.machine_name as string;
        
        if (!ipMap.has(ip)) ipMap.set(ip, { base: 0, end: 0, name });
        const entry = ipMap.get(ip)!;
        if (logDate === baseDateStr) entry.base = count;
        else if (logDate === endDate) entry.end = count;
      }
      
      // 计算每台打印机的月度打印量
      for (const [ip, data] of ipMap) {
        const monthlyPrints = Math.max(0, data.end - data.base);
        dataPoint.count += monthlyPrints;
        
        const printer = printers.find(p => p.machine_ip === ip);
        const name = printer?.machine_name || data.name;
        dataPoint[name] = (dataPoint[name] as number || 0) + monthlyPrints;
      }
      
      result.push(dataPoint);
    } else {
      // 单日模式 - 查找最近有数据的基准日期
      const date = dateParam;
      
      // 先检查前一天是否有数据
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      const defaultPrevDateStr = prevDate.toISOString().split('T')[0];
      
      const checkResult = await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM printer_logs WHERE log_date = ?`,
        args: [defaultPrevDateStr],
      });
      
      let prevDateStr = defaultPrevDateStr;
      if (Number(checkResult.rows[0]?.cnt) === 0) {
        // 前一天没有数据，往前找最近有数据的日期（最多30天）
        const searchStart = new Date(date);
        searchStart.setDate(searchStart.getDate() - 30);
        const searchStartStr = searchStart.toISOString().split('T')[0];
        
        const nearestResult = await db.execute({
          sql: `SELECT MAX(log_date) as nearest FROM printer_logs WHERE log_date >= ? AND log_date < ?`,
          args: [searchStartStr, date],
        });
        
        const nearest = nearestResult.rows[0]?.nearest as string | null;
        if (nearest) prevDateStr = nearest;
      }
      
      const logsResult = await db.execute({
        sql: `SELECT machine_ip, machine_name, log_date, print_count FROM printer_logs WHERE log_date IN (?, ?) ORDER BY machine_ip`,
        args: [prevDateStr, date],
      });
      
      const dataPoint: DashboardChartPoint = { date: date.slice(5), count: 0 };
      
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
      
      for (const [ip, data] of ipMap) {
        const dailyPrints = Math.max(0, data.curr - data.prev);
        dataPoint.count += dailyPrints;
        
        const printer = printers.find(p => p.machine_ip === ip);
        const name = printer?.machine_name || data.name;
        dataPoint[name] = (dataPoint[name] as number || 0) + dailyPrints;
      }
      
      result.push(dataPoint);
    }
  }
  
  return result;
}

/** 获取看板饼图数据 (云端) */
export async function getDashboardPieData(startDate: string, endDate: string): Promise<DashboardPieData[]> {
  const db = getDatabase();
  const printers = await getAllPrinters();
  
  // 查找最近有数据的基准日期（往前最多找30天）
  const findBaseDateStr = async (): Promise<string> => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 1);
    const defaultBaseDateStr = d.toISOString().split('T')[0];
    
    // 检查前一天是否有数据
    const checkResult = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM printer_logs WHERE log_date = ?`,
      args: [defaultBaseDateStr],
    });
    
    if (Number(checkResult.rows[0]?.cnt) > 0) {
      return defaultBaseDateStr;
    }
    
    // 如果前一天没有数据，往前找最近有数据的日期（最多30天）
    const searchStart = new Date(startDate);
    searchStart.setDate(searchStart.getDate() - 30);
    const searchStartStr = searchStart.toISOString().split('T')[0];
    
    const nearestResult = await db.execute({
      sql: `SELECT MAX(log_date) as nearest FROM printer_logs WHERE log_date >= ? AND log_date < ?`,
      args: [searchStartStr, startDate],
    });
    
    const nearest = nearestResult.rows[0]?.nearest as string | null;
    return nearest || defaultBaseDateStr;
  };
  
  const baseDateStr = await findBaseDateStr();
  
  // 获取日期范围内的数据（包含前一天作为基准）
  const logsResult = await db.execute({
    sql: `SELECT machine_ip, machine_name, log_date, print_count FROM printer_logs WHERE log_date >= ? AND log_date <= ? ORDER BY machine_ip, log_date`,
    args: [baseDateStr, endDate],
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
      const currentDate = dates[i];
      // 跳过基准日期，它只用于计算第一天的差值
      if (currentDate < startDate) continue;
      
      const curr = dateMap.get(currentDate) || 0;
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

// ============================================
// 打印机数据同步功能
// ============================================

/** 打印机同步配置 */
interface PrinterSyncConfig {
  name: string;
  ip: string;
  url: string;
}

/** 同步结果 */
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  details: { name: string; success: boolean; count?: number; error?: string }[];
}

/** 从打印机网页抓取打印计数 */
async function fetchPrintCount(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(10000) 
    });
    const html = await response.text();
    
    // 策略A: 匹配彩机 JS 数组格式 var info=['Total Printed Impressions',279333,...]
    const jsArrayMatch = html.match(/['"]Total Printed Impressions['"]\s*,\s*(\d+)/i);
    if (jsArrayMatch) {
      return parseInt(jsArrayMatch[1], 10);
    }
    
    // 策略B: 匹配普通机器 HTML 标签格式 >4677634<
    const cleanHtml = html.replace(/\r/g, '').replace(/\n/g, '').replace(/\s+/g, ' ');
    const tagMatches = cleanHtml.match(/>(\d+)</g);
    if (tagMatches && tagMatches.length > 0) {
      const firstMatch = tagMatches[0].match(/>(\d+)</);
      if (firstMatch) {
        return parseInt(firstMatch[1], 10);
      }
    }
    
    return null;
  } catch (error) {
    console.error(`抓取打印计数失败 (${url}):`, error);
    return null;
  }
}

/** 同步单台打印机数据到数据库 */
async function syncSinglePrinter(db: Client, config: PrinterSyncConfig): Promise<{ success: boolean; count?: number; error?: string }> {
  const printCount = await fetchPrintCount(config.url);
  
  if (printCount === null) {
    return { success: false, error: '无法获取打印计数' };
  }
  
  // 使用中国时区 (UTC+8)
  const now = new Date();
  const chinaOffset = 8 * 60 * 60 * 1000; // UTC+8
  const chinaTime = new Date(now.getTime() + chinaOffset);
  const today = chinaTime.toISOString().split('T')[0];
  const nowStr = chinaTime.toISOString().replace('T', ' ').substring(0, 19);
  
  try {
    await db.execute({
      sql: `INSERT INTO printer_logs (machine_name, machine_ip, print_count, log_date, created_at) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT(machine_ip, log_date) DO UPDATE SET 
            print_count = excluded.print_count, created_at = excluded.created_at`,
      args: [config.name, config.ip, printCount, today, nowStr],
    });
    
    return { success: true, count: printCount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** 同步所有打印机数据 */
export async function syncAllPrinterData(): Promise<SyncResult> {
  const db = getDatabase();
  
  // 从数据库获取打印机配置
  const printers = await getAllPrinters();
  
  const syncConfigs: PrinterSyncConfig[] = printers.map(p => {
    // 优先使用数据库中配置的 scrape_url，否则根据打印机类型生成默认URL
    let url = p.scrape_url;
    if (!url) {
      url = p.printer_type === 'color' 
        ? `http://${p.machine_ip}/prcnt.htm`
        : `http://${p.machine_ip}/web/guest/cn/websys/status/getUnificationCounter.cgi`;
    }
    
    return {
      name: p.machine_name,
      ip: p.machine_ip,
      url,
    };
  });
  
  const results: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    details: [],
  };
  
  for (const config of syncConfigs) {
    const result = await syncSinglePrinter(db, config);
    results.details.push({
      name: config.name,
      success: result.success,
      count: result.count,
      error: result.error,
    });
    
    if (result.success) {
      results.synced++;
    } else {
      results.failed++;
    }
  }
  
  results.success = results.failed === 0;
  return results;
}

// ============================================
// 数据对比功能 (云端)
// ============================================

/** 云端数据对比结果 */
export interface CloudComparisonData {
  day_over_day: {
    yesterday: number;
    today: number;
    change: number;
    change_percent: number;
  };
  week_over_week: {
    last_week: number;
    this_week: number;
    change: number;
    change_percent: number;
  };
  month_over_month: {
    last_month: number;
    this_month: number;
    change: number;
    change_percent: number;
  };
}

/** 计算指定日期范围内的实际印量 (累计差值) */
async function calcPrintCountForRange(startDate: string, endDate: string, machineIP?: string): Promise<number> {
  const db = getDatabase();
  
  // 获取前一天作为基准
  const baseDate = new Date(startDate);
  baseDate.setDate(baseDate.getDate() - 1);
  const baseDateStr = baseDate.toISOString().split('T')[0];
  
  let sql = `SELECT machine_ip, log_date, print_count FROM printer_logs WHERE log_date >= ? AND log_date <= ?`;
  const args: any[] = [baseDateStr, endDate];
  
  if (machineIP) {
    sql += ` AND machine_ip = ?`;
    args.push(machineIP);
  }
  sql += ` ORDER BY machine_ip, log_date`;
  
  const result = await db.execute({ sql, args });
  
  // 按 IP 分组计算
  const ipDateMap = new Map<string, Map<string, number>>();
  for (const row of result.rows) {
    const ip = row.machine_ip as string;
    const date = row.log_date as string;
    const count = Number(row.print_count) || 0;
    if (!ipDateMap.has(ip)) ipDateMap.set(ip, new Map());
    ipDateMap.get(ip)!.set(date, count);
  }
  
  let totalCount = 0;
  for (const [ip, dateMap] of ipDateMap) {
    const dates = Array.from(dateMap.keys()).sort();
    for (let i = 0; i < dates.length; i++) {
      const currentDate = dates[i];
      if (currentDate < startDate) continue; // 跳过基准日期
      const curr = dateMap.get(currentDate) || 0;
      const prev = i > 0 ? (dateMap.get(dates[i - 1]) || 0) : 0;
      totalCount += Math.max(0, curr - prev);
    }
  }
  
  return totalCount;
}

/** 获取云端数据对比 */
export async function getCloudComparisonData(machineIP?: string): Promise<CloudComparisonData> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // 昨天
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // 本周开始 (周一)
  const thisWeekStart = new Date(today);
  const dayOfWeek = thisWeekStart.getDay() || 7;
  thisWeekStart.setDate(thisWeekStart.getDate() - dayOfWeek + 1);
  const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];
  
  // 上周
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];
  
  // 本月开始
  const thisMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  
  // 上月
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthStart = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];
  
  // 并行计算各时间段数据
  const [todayCount, yesterdayCount, thisWeekCount, lastWeekCount, thisMonthCount, lastMonthCount] = await Promise.all([
    calcPrintCountForRange(todayStr, todayStr, machineIP),
    calcPrintCountForRange(yesterdayStr, yesterdayStr, machineIP),
    calcPrintCountForRange(thisWeekStartStr, todayStr, machineIP),
    calcPrintCountForRange(lastWeekStartStr, lastWeekEndStr, machineIP),
    calcPrintCountForRange(thisMonthStart, todayStr, machineIP),
    calcPrintCountForRange(lastMonthStart, lastMonthEndStr, machineIP),
  ]);
  
  const calcChange = (current: number, previous: number) => ({
    change: current - previous,
    change_percent: previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : 0,
  });
  
  return {
    day_over_day: {
      yesterday: yesterdayCount,
      today: todayCount,
      ...calcChange(todayCount, yesterdayCount),
    },
    week_over_week: {
      last_week: lastWeekCount,
      this_week: thisWeekCount,
      ...calcChange(thisWeekCount, lastWeekCount),
    },
    month_over_month: {
      last_month: lastMonthCount,
      this_month: thisMonthCount,
      ...calcChange(thisMonthCount, lastMonthCount),
    },
  };
}

// ============================================
// 代码备注管理 (SP代码/错误代码)
// ============================================

export interface CodeNote {
  id?: number;
  code_type: 'sp' | 'error';  // sp=SP代码, error=错误代码
  code: string;               // 代码，如 SP5801, SC300
  note: string;               // 备注内容
  created_at?: string;
  updated_at?: string;
}

/** 获取所有备注 */
export async function getAllCodeNotes(codeType?: 'sp' | 'error'): Promise<CodeNote[]> {
  const db = getDatabase();
  
  let sql = 'SELECT * FROM code_notes';
  const args: any[] = [];
  
  if (codeType) {
    sql += ' WHERE code_type = ?';
    args.push(codeType);
  }
  
  sql += ' ORDER BY code';
  
  const result = await db.execute({ sql, args });
  
  return result.rows.map(row => ({
    id: Number(row.id),
    code_type: row.code_type as 'sp' | 'error',
    code: row.code as string,
    note: row.note as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }));
}

/** 获取单个代码的备注 */
export async function getCodeNote(codeType: 'sp' | 'error', code: string): Promise<CodeNote | null> {
  const db = getDatabase();
  
  const result = await db.execute({
    sql: 'SELECT * FROM code_notes WHERE code_type = ? AND code = ?',
    args: [codeType, code],
  });
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: Number(row.id),
    code_type: row.code_type as 'sp' | 'error',
    code: row.code as string,
    note: row.note as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** 保存或更新备注 */
export async function saveCodeNote(codeType: 'sp' | 'error', code: string, note: string): Promise<boolean> {
  const db = getDatabase();
  
  // 如果备注为空，删除记录
  if (!note.trim()) {
    await db.execute({
      sql: 'DELETE FROM code_notes WHERE code_type = ? AND code = ?',
      args: [codeType, code],
    });
    return true;
  }
  
  // 使用 UPSERT
  await db.execute({
    sql: `INSERT INTO code_notes (code_type, code, note, updated_at) 
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(code_type, code) DO UPDATE SET 
          note = excluded.note, updated_at = datetime('now')`,
    args: [codeType, code, note.trim()],
  });
  
  return true;
}

/** 批量导入备注 (从 localStorage 迁移) */
export async function importCodeNotes(notes: { codeType: 'sp' | 'error'; code: string; note: string }[]): Promise<number> {
  const db = getDatabase();
  let imported = 0;
  
  for (const item of notes) {
    if (item.note.trim()) {
      await db.execute({
        sql: `INSERT INTO code_notes (code_type, code, note, updated_at) 
              VALUES (?, ?, ?, datetime('now'))
              ON CONFLICT(code_type, code) DO UPDATE SET 
              note = excluded.note, updated_at = datetime('now')`,
        args: [item.codeType, item.code, item.note.trim()],
      });
      imported++;
    }
  }
  
  return imported;
}

/** 删除备注 */
export async function deleteCodeNote(codeType: 'sp' | 'error', code: string): Promise<boolean> {
  const db = getDatabase();
  
  await db.execute({
    sql: 'DELETE FROM code_notes WHERE code_type = ? AND code = ?',
    args: [codeType, code],
  });
  
  return true;
}

// ============================================
// 操作人管理
// ============================================

export interface Operator {
  id: number;
  name: string;
  created_at: string;
}

/** 获取所有操作人 */
export async function getAllOperators(): Promise<Operator[]> {
  const db = getDatabase();
  const result = await db.execute('SELECT * FROM operators ORDER BY name');
  return result.rows.map(row => ({
    id: row.id as number,
    name: row.name as string,
    created_at: row.created_at as string,
  }));
}

/** 添加操作人 */
export async function addOperator(name: string): Promise<Operator> {
  const db = getDatabase();
  await db.execute({ sql: 'INSERT INTO operators (name) VALUES (?)', args: [name.trim()] });
  const result = await db.execute({ sql: 'SELECT * FROM operators WHERE name = ?', args: [name.trim()] });
  const row = result.rows[0];
  return { id: row.id as number, name: row.name as string, created_at: row.created_at as string };
}

/** 更新操作人 */
export async function updateOperator(id: number, name: string): Promise<Operator | null> {
  const db = getDatabase();
  await db.execute({ sql: 'UPDATE operators SET name = ? WHERE id = ?', args: [name.trim(), id] });
  const result = await db.execute({ sql: 'SELECT * FROM operators WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { id: row.id as number, name: row.name as string, created_at: row.created_at as string };
}

/** 删除操作人 */
export async function deleteOperator(id: number): Promise<boolean> {
  const db = getDatabase();
  const result = await db.execute({ sql: 'DELETE FROM operators WHERE id = ?', args: [id] });
  return result.rowsAffected > 0;
}

// ============================================
// 损耗理由管理
// ============================================

export interface DamageReason {
  id: number;
  reason: string;
  created_at: string;
}

/** 获取所有损耗理由 */
export async function getAllDamageReasons(): Promise<DamageReason[]> {
  const db = getDatabase();
  const result = await db.execute('SELECT * FROM damage_reasons ORDER BY reason');
  return result.rows.map(row => ({
    id: row.id as number,
    reason: row.reason as string,
    created_at: row.created_at as string,
  }));
}

/** 添加损耗理由 */
export async function addDamageReason(reason: string): Promise<DamageReason> {
  const db = getDatabase();
  await db.execute({ sql: 'INSERT INTO damage_reasons (reason) VALUES (?)', args: [reason.trim()] });
  const result = await db.execute({ sql: 'SELECT * FROM damage_reasons WHERE reason = ?', args: [reason.trim()] });
  const row = result.rows[0];
  return { id: row.id as number, reason: row.reason as string, created_at: row.created_at as string };
}

/** 更新损耗理由 */
export async function updateDamageReason(id: number, reason: string): Promise<DamageReason | null> {
  const db = getDatabase();
  await db.execute({ sql: 'UPDATE damage_reasons SET reason = ? WHERE id = ?', args: [reason.trim(), id] });
  const result = await db.execute({ sql: 'SELECT * FROM damage_reasons WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { id: row.id as number, reason: row.reason as string, created_at: row.created_at as string };
}

/** 删除损耗理由 */
export async function deleteDamageReason(id: number): Promise<boolean> {
  const db = getDatabase();
  const result = await db.execute({ sql: 'DELETE FROM damage_reasons WHERE id = ?', args: [id] });
  return result.rowsAffected > 0;
}

// ============================================
// 其他收入明细管理 (多记录模式)
// ============================================

export interface OtherRevenueDetail {
  id: number;
  revenue_date: string;
  amount: number;
  cost: number;
  description: string;
  category: string;
  operator: string;
  created_at: string;
}

/** 获取某天的其他收入明细 */
export async function getOtherRevenueRecords(date: string): Promise<OtherRevenueDetail[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: `SELECT id, revenue_date, amount, COALESCE(cost, 0) as cost, COALESCE(description, '') as description, 
          COALESCE(category, '其他') as category, COALESCE(operator, '') as operator, created_at 
          FROM other_revenues WHERE revenue_date = ? ORDER BY created_at DESC`,
    args: [date],
  });
  return result.rows.map(row => ({
    id: row.id as number,
    revenue_date: row.revenue_date as string,
    amount: row.amount as number,
    cost: row.cost as number,
    description: row.description as string,
    category: row.category as string,
    operator: row.operator as string,
    created_at: row.created_at as string,
  }));
}

/** 添加其他收入记录 */
export async function addOtherRevenueRecord(data: { 
  date: string; amount: number; cost: number; description: string; category: string; operator: string 
}): Promise<OtherRevenueDetail> {
  const db = getDatabase();
  await db.execute({
    sql: `INSERT INTO other_revenues (revenue_date, amount, cost, description, category, operator) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [data.date, data.amount, data.cost, data.description, data.category, data.operator],
  });
  const result = await db.execute({
    sql: `SELECT * FROM other_revenues WHERE revenue_date = ? ORDER BY id DESC LIMIT 1`,
    args: [data.date],
  });
  const row = result.rows[0];
  return {
    id: row.id as number,
    revenue_date: row.revenue_date as string,
    amount: row.amount as number,
    cost: (row.cost as number) || 0,
    description: (row.description as string) || '',
    category: (row.category as string) || '其他',
    operator: (row.operator as string) || '',
    created_at: row.created_at as string,
  };
}

/** 删除其他收入记录 */
export async function deleteOtherRevenueRecord(id: number): Promise<boolean> {
  const db = getDatabase();
  const result = await db.execute({ sql: 'DELETE FROM other_revenues WHERE id = ?', args: [id] });
  return result.rowsAffected > 0;
}
