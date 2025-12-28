/**
 * ============================================
 * 打印机管理系统 - 类型定义文件
 * ============================================
 * 这个文件定义了整个应用中使用的所有数据结构
 * 主进程和渲染进程都会使用这些类型
 */

/**
 * 打印机配置接口
 * 存储在 config.json 中，包含打印机的元数据和爬虫配置
 */
export interface PrinterConfig {
  id: string;                    // 唯一标识符 (UUID)
  alias: string;                 // 自定义别名 (例如: "财务室夏普")
  target_url: string;            // 抓取地址 (打印机的网页地址)
  dom_selector: string;          // CSS 选择器 (用于定位计数器数值)
  printer_type?: 'mono' | 'color'; // 打印机类型: mono=黑白机, color=彩机
  financials: {
    cost_per_page: number;       // 单张成本 (例如: 0.05 元)
    price_per_page: number;      // 单张售价 (例如: 0.50 元)
    revenue_formula?: string;    // 自定义收益公式 (例如: "count * 0.5")
    cost_formula?: string;       // 自定义成本公式 (例如: "count * 0.05")
  };
  last_updated: string;          // 最后更新时间 (ISO 日期格式)
  status: 'online' | 'offline' | 'error';  // 打印机状态
}

/**
 * 每日记录接口
 * 存储在 records.json 中，记录每天的打印数据快照
 */
export interface DailyRecord {
  record_id: string;             // 记录的唯一标识符
  printer_id: string;            // 关联的打印机 ID
  date: string;                  // 日期 (YYYY-MM-DD 格式，作为主索引)
  total_counter: number;         // 当日抓取的总读数
  daily_increment: number;       // 当日新增印量 (今日总数 - 昨日总数)
  waste_count: number;           // 损耗数量 (卡纸、错打等，默认0)
  timestamp: number;             // 记录创建的时间戳
}

/**
 * 配置文件的完整结构
 */
export interface ConfigFile {
  printers: PrinterConfig[];     // 所有打印机的配置列表
  settings: AppSettings;         // 应用设置
}

/**
 * 应用设置
 */
export interface AppSettings {
  data_path: string;             // 数据存储路径 (默认: E:\PrinterData\)
  auto_refresh_interval: number; // 自动刷新间隔 (分钟，0 表示禁用)
  default_selector: string;      // 默认的 CSS 选择器
}

/**
 * 爬虫抓取结果
 */
export interface ScrapeResult {
  success: boolean;              // 是否成功
  printer_id: string;            // 打印机 ID
  counter?: number;              // 抓取到的计数器数值
  error?: string;                // 错误信息 (如果失败)
  timestamp: number;             // 抓取时间戳
}

/**
 * BI 看板的统计数据
 */
export interface DashboardStats {
  today_total: number;           // 今日总印量
  today_change_percent: number;  // 环比昨日变化百分比
  month_revenue: number;         // 本月预估营收
  month_change_percent: number;  // 环比上月变化百分比
  month_profit: number;          // 本月净利润
  month_cost: number;            // 本月成本
}

/**
 * 图表数据 - 近7天印量走势
 */
export interface ChartDataPoint {
  date: string;                  // 日期
  count: number;                 // 印量
  [key: string]: string | number; // 动态字段，支持每台设备的数据
}

/**
 * 饼图数据 - 设备贡献占比
 */
export interface PieChartData {
  name: string;                  // 打印机别名
  value: number;                 // 印量
  percentage: number;            // 占比百分比
}

/**
 * 数据对比结果
 */
export interface ComparisonData {
  day_over_day: {                // 昨日 vs 今日
    yesterday: number;
    today: number;
    change: number;
    change_percent: number;
  };
  week_over_week: {              // 本周 vs 上周
    last_week: number;
    this_week: number;
    change: number;
    change_percent: number;
  };
  month_over_month: {            // 本月 vs 上月
    last_month: number;
    this_month: number;
    change: number;
    change_percent: number;
  };
}

/**
 * 打印机详情数据 (从 getStatus.cgi 获取)
 */
export interface PrinterDetail {
  [key: string]: string;         // 动态字段，键值对形式
}

/**
 * 每日营收明细
 */
export interface DailyRevenueDetail {
  date: string;                  // 日期
  count: number;                 // 印量
  revenue: number;               // 营收
  cost: number;                  // 成本
  profit: number;                // 利润
}

/**
 * 每台打印机的日营收数据
 */
export interface PrinterDailyData {
  printerId: string;
  printerName: string;
  count: number;                 // 打印数量（物理增量）
  wasteCount?: number;           // 损耗数量
  cost: number;                  // 成本（基于物理增量）
  revenue: number;               // 收益（基于有效印量）
  profit: number;                // 利润
}

/**
 * 月度营收汇总（按日期）
 */
export interface MonthlyRevenueData {
  date: string;
  printers: PrinterDailyData[];  // 每台机器数据
  otherIncome: number;           // 其他收入
  otherIncomeNote: string;       // 其他收入备注
  rent: number;                  // 房租（默认-150）
  totalRevenue: number;          // 总营业额
  netProfit: number;             // 纯利润
}

/**
 * 其他营收记录
 */
export interface OtherRevenue {
  id: string;                    // 唯一标识
  date: string;                  // 日期 YYYY-MM-DD
  amount: number;                // 金额
  description: string;           // 描述/备注
  category: string;              // 分类
  timestamp: number;             // 创建时间戳
}

/**
 * 云端打印机配置 (对应 printers 表)
 */
export interface CloudPrinterConfig {
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

/**
 * 云端打印机信息 (从 Turso 数据库)
 */
export interface CloudPrinter {
  machine_name: string;
  machine_ip: string;
}

/**
 * 云端打印日志 (对应 printer_logs 表)
 */
export interface CloudPrinterLog {
  id: number;
  machine_name: string;
  machine_ip: string;
  print_count: number;
  log_date: string;
  created_at: string;
}

/**
 * IPC 通信的 API 接口定义
 * 这些方法会通过 contextBridge 暴露给渲染进程
 */
export interface ElectronAPI {
  // 打印机管理
  getPrinters: () => Promise<PrinterConfig[]>;
  addPrinter: (printer: Omit<PrinterConfig, 'id' | 'last_updated' | 'status'>) => Promise<PrinterConfig>;
  updatePrinter: (printer: PrinterConfig) => Promise<PrinterConfig>;
  deletePrinter: (id: string) => Promise<boolean>;
  
  // 爬虫操作
  testScrape: (url: string, selector: string) => Promise<ScrapeResult>;
  refreshAll: () => Promise<ScrapeResult[]>;
  refreshOne: (printerId: string) => Promise<ScrapeResult>;
  
  // 打印机详情
  getPrinterDetail: (baseUrl: string) => Promise<{ success: boolean; data?: PrinterDetail; error?: string }>;
  
  // 数据查询
  getRecords: (printerId?: string, startDate?: string, endDate?: string) => Promise<DailyRecord[]>;
  getDashboardStats: () => Promise<DashboardStats>;
  getChartData: (days: number) => Promise<ChartDataPoint[]>;
  getPieChartData: () => Promise<PieChartData[]>;
  getComparisonData: (printerId?: string) => Promise<ComparisonData>;
  getMonthlyRevenueDetail: (year: number, month: number) => Promise<DailyRevenueDetail[]>;
  getMonthlyRevenueData: (year: number, month: number) => Promise<MonthlyRevenueData[]>;
  
  // 其他营收管理
  getOtherRevenues: (year?: number, month?: number) => Promise<OtherRevenue[]>;
  addOtherRevenue: (revenue: Omit<OtherRevenue, 'id' | 'timestamp'>) => Promise<OtherRevenue>;
  deleteOtherRevenue: (id: string) => Promise<boolean>;
  // 导入历史数据
  importHistoryData: () => Promise<{ success: boolean; message: string; matchedPrinters?: string[]; unmatchedHeaders?: string[] }>;
  // 更新损耗数量
  updateWasteCount: (date: string, printerId: string, wasteCount: number) => Promise<boolean>;
  
  // ========== 云端数据 (Turso) ==========
  getCloudPrinters: () => Promise<{ success: boolean; data?: CloudPrinter[]; error?: string }>;
  getCloudLogs: (machineName?: string, startDate?: string, endDate?: string) => Promise<{ success: boolean; data?: CloudPrinterLog[]; error?: string }>;
  getCloudDailyStats: (startDate: string, endDate: string) => Promise<{ success: boolean; data?: CloudPrinterLog[]; error?: string }>;
  testCloudConnection: () => Promise<{ success: boolean; message?: string; error?: string }>;
  
  // ========== 云端打印机 CRUD (printers 表) ==========
  getCloudPrinterConfigs: () => Promise<{ success: boolean; data?: CloudPrinterConfig[]; error?: string }>;
  addCloudPrinter: (printer: Omit<CloudPrinterConfig, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; data?: CloudPrinterConfig; error?: string }>;
  updateCloudPrinter: (id: number, printer: Partial<CloudPrinterConfig>) => Promise<{ success: boolean; data?: CloudPrinterConfig; error?: string }>;
  deleteCloudPrinter: (id: number) => Promise<{ success: boolean; data?: boolean; error?: string }>;
  
  // ========== IP 检查和统计 ==========
  checkIPExists: (machineIP: string) => Promise<{ success: boolean; data?: { exists: boolean; machine_name?: string }; error?: string }>;
  getAllPrinterStats: () => Promise<{ success: boolean; data?: PrinterStatsData[]; error?: string }>;
  autoAddPrintersFromLogs: () => Promise<{ success: boolean; added?: number; message?: string; error?: string }>;
  
  // ========== 云端营收管理 ==========
  getCloudMonthlyRevenue: (year: number, month: number) => Promise<{ success: boolean; data?: CloudMonthlyRevenueData[]; error?: string }>;
  addCloudOtherRevenue: (data: { date: string; amount: number; description: string; category: string }) => Promise<{ success: boolean; error?: string }>;
  updateCloudWaste: (machineIP: string, wasteDate: string, wasteCount: number) => Promise<{ success: boolean; error?: string }>;
}

/** 打印机统计数据 */
export interface PrinterStatsData {
  printer: CloudPrinterConfig;
  total_prints: number;
  today_prints: number;
  month_prints: number;
  total_cost: number;
  total_revenue: number;
  total_profit: number;
  today_revenue: number;
  today_cost: number;
  today_profit: number;
  month_revenue: number;
  month_cost: number;
  month_profit: number;
}

/** 云端月度营收数据 */
export interface CloudMonthlyRevenueData {
  date: string;
  printers: {
    printerId: string;
    printerName: string;
    count: number;
    wasteCount: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
  otherIncome: number;
  otherIncomeNote: string;
  netProfit: number;
  rent: number;
}

// 扩展 Window 接口，添加 electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
