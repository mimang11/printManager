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
