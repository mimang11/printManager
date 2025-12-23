/**
 * ============================================
 * 文件管理器 - 处理数据持久化
 * ============================================
 * 负责读写 config.json 和 records.json
 */

import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import { ConfigFile, DailyRecord, AppSettings, OtherRevenue } from '../shared/types';

// 默认的 CSS 选择器 (用户提供)
const DEFAULT_SELECTOR = 'table > tbody > tr > td:nth-child(3) > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(1) > tbody > tr > td:nth-child(4)';

// 获取数据目录路径
function getDataDir(): string {
  // 优先使用 E:\PrinterData，如果 E: 盘不存在则使用用户文档目录
  const preferredPath = 'E:\\PrinterData';
  try {
    if (fs.existsSync('E:\\')) {
      return preferredPath;
    }
  } catch {
    // E: 盘不存在
  }
  return path.join(app.getPath('documents'), 'PrinterData');
}

// 延迟初始化路径
let DATA_DIR: string;
let CONFIG_FILE: string;
let RECORDS_FILE: string;

function initPaths() {
  if (!DATA_DIR) {
    DATA_DIR = getDataDir();
    CONFIG_FILE = path.join(DATA_DIR, 'config.json');
    RECORDS_FILE = path.join(DATA_DIR, 'records.json');
  }
}

// 获取默认设置
function getDefaultSettings(): AppSettings {
  initPaths();
  return {
    data_path: DATA_DIR,
    auto_refresh_interval: 0,
    default_selector: DEFAULT_SELECTOR,
  };
}

// 获取默认配置
function getDefaultConfig(): ConfigFile {
  return {
    printers: [],
    settings: getDefaultSettings(),
  };
}

/**
 * 初始化数据目录
 */
export async function initDataDirectory(): Promise<void> {
  initPaths();
  try {
    await fs.ensureDir(DATA_DIR);
    console.log(`数据目录已就绪: ${DATA_DIR}`);

    if (!await fs.pathExists(CONFIG_FILE)) {
      await fs.writeJson(CONFIG_FILE, getDefaultConfig(), { spaces: 2 });
      console.log('已创建默认配置文件');
    }

    if (!await fs.pathExists(RECORDS_FILE)) {
      await fs.writeJson(RECORDS_FILE, [], { spaces: 2 });
      console.log('已创建记录文件');
    }
  } catch (error) {
    console.error('初始化数据目录失败:', error);
    throw error;
  }
}

export async function loadConfig(): Promise<ConfigFile> {
  initPaths();
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      const config = await fs.readJson(CONFIG_FILE);
      const defaultConfig = getDefaultConfig();
      return {
        ...defaultConfig,
        ...config,
        settings: { ...defaultConfig.settings, ...config.settings },
      };
    }
    return getDefaultConfig();
  } catch (error) {
    console.error('加载配置文件失败:', error);
    return getDefaultConfig();
  }
}

export async function saveConfig(config: ConfigFile): Promise<void> {
  initPaths();
  await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
}

export async function loadRecords(): Promise<DailyRecord[]> {
  initPaths();
  try {
    if (await fs.pathExists(RECORDS_FILE)) {
      return await fs.readJson(RECORDS_FILE);
    }
    return [];
  } catch (error) {
    console.error('加载记录文件失败:', error);
    return [];
  }
}

export async function saveRecords(records: DailyRecord[]): Promise<void> {
  initPaths();
  await fs.writeJson(RECORDS_FILE, records, { spaces: 2 });
}

export function getDefaultSelector(): string {
  return DEFAULT_SELECTOR;
}

// 其他营收文件路径
function getOtherRevenuesFile(): string {
  initPaths();
  return path.join(DATA_DIR, 'other_revenues.json');
}

export async function loadOtherRevenues(): Promise<OtherRevenue[]> {
  const filePath = getOtherRevenuesFile();
  try {
    if (await fs.pathExists(filePath)) {
      return await fs.readJson(filePath);
    }
    return [];
  } catch (error) {
    console.error('加载其他营收失败:', error);
    return [];
  }
}

export async function saveOtherRevenues(revenues: OtherRevenue[]): Promise<void> {
  const filePath = getOtherRevenuesFile();
  await fs.writeJson(filePath, revenues, { spaces: 2 });
}
