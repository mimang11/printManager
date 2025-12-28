/**
 * ============================================
 * Turso 数据库连接模块
 * ============================================
 * 使用 @libsql/client 连接 Turso 云端数据库
 */

import { createClient, Client } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

let client: Client | null = null;

/**
 * 从 .env 文件读取环境变量
 */
function loadEnvFile(): { url: string; authToken: string } {
  // 尝试多个可能的 .env 文件位置
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

  client = createClient({
    url,
    authToken,
  });

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

/**
 * 打印机日志记录 (对应 printer_logs 表)
 */
export interface PrinterLog {
  id: number;
  machine_name: string;
  machine_ip: string;
  print_count: number;
  log_date: string;
  created_at: string;
}

/**
 * 从数据库获取所有打印机（按 machine_name 去重）
 */
export async function getPrintersFromDB(): Promise<{ machine_name: string; machine_ip: string }[]> {
  const db = getDatabase();
  const result = await db.execute(`
    SELECT DISTINCT machine_name, machine_ip 
    FROM printer_logs 
    ORDER BY machine_name
  `);
  
  return result.rows.map(row => ({
    machine_name: row.machine_name as string,
    machine_ip: row.machine_ip as string,
  }));
}

/**
 * 获取打印记录
 */
export async function getPrinterLogsFromDB(
  machineName?: string,
  startDate?: string,
  endDate?: string
): Promise<PrinterLog[]> {
  const db = getDatabase();
  
  let sql = 'SELECT * FROM printer_logs WHERE 1=1';
  const args: any[] = [];
  
  if (machineName) {
    sql += ' AND machine_name = ?';
    args.push(machineName);
  }
  if (startDate) {
    sql += ' AND log_date >= ?';
    args.push(startDate);
  }
  if (endDate) {
    sql += ' AND log_date <= ?';
    args.push(endDate);
  }
  
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

/**
 * 获取指定日期范围内每台打印机每天的打印量
 */
export async function getDailyPrintCounts(
  startDate: string,
  endDate: string
): Promise<PrinterLog[]> {
  const db = getDatabase();
  
  const result = await db.execute({
    sql: `
      SELECT * FROM printer_logs 
      WHERE log_date >= ? AND log_date <= ?
      ORDER BY log_date, machine_name
    `,
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

/**
 * 获取今日打印数据
 */
export async function getTodayPrintData(): Promise<PrinterLog[]> {
  const today = new Date().toISOString().split('T')[0];
  return getPrinterLogsFromDB(undefined, today, today);
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (client) {
    client.close();
    client = null;
  }
}
