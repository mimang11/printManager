/**
 * 打印机管理系统 - 类型定义文件
 */

/** 打印机详情数据 (从 getStatus.cgi 获取) */
export interface PrinterDetail {
  [key: string]: string;
}

/** 云端打印机配置 (对应 printers 表) */
export interface CloudPrinterConfig {
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

/** 操作人 */
export interface Operator {
  id: number;
  name: string;
  created_at: string;
}

/** 损耗理由 */
export interface DamageReason {
  id: number;
  reason: string;
  created_at: string;
}

/** 其他收入明细 */
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

/** IPC 通信的 API 接口定义 */
export interface ElectronAPI {
  // 打印机详情
  getPrinterDetail: (baseUrl: string) => Promise<{ success: boolean; data?: PrinterDetail; error?: string }>;
  
  // 云端打印机 CRUD
  getCloudPrinterConfigs: () => Promise<{ success: boolean; data?: CloudPrinterConfig[]; error?: string }>;
  addCloudPrinter: (printer: Omit<CloudPrinterConfig, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; data?: CloudPrinterConfig; error?: string }>;
  updateCloudPrinter: (id: number, printer: Partial<CloudPrinterConfig>) => Promise<{ success: boolean; data?: CloudPrinterConfig; error?: string }>;
  deleteCloudPrinter: (id: number) => Promise<{ success: boolean; data?: boolean; error?: string }>;
  
  // IP 检查和统计
  checkIPExists: (machineIP: string) => Promise<{ success: boolean; data?: { exists: boolean; machine_name?: string }; error?: string }>;
  getAllPrinterStats: () => Promise<{ success: boolean; data?: PrinterStatsData[]; error?: string }>;
  autoAddPrintersFromLogs: () => Promise<{ success: boolean; added?: number; message?: string; error?: string }>;
  
  // 云端营收管理
  getCloudMonthlyRevenue: (year: number, month: number) => Promise<{ success: boolean; data?: CloudMonthlyRevenueData[]; error?: string }>;
  addCloudOtherRevenue: (data: { date: string; amount: number; description: string; category: string }) => Promise<{ success: boolean; error?: string }>;
  updateCloudWaste: (machineIP: string, wasteDate: string, wasteCount: number) => Promise<{ success: boolean; error?: string }>;
  getWasteRecords: (machineIP: string, wasteDate: string) => Promise<{ success: boolean; data?: WasteRecordDetail[]; error?: string }>;
  addWasteRecord: (data: { machineIP: string; wasteDate: string; wasteCount: number; note: string; operator: string }) => Promise<{ success: boolean; data?: WasteRecordDetail; error?: string }>;
  deleteWasteRecord: (id: number) => Promise<{ success: boolean; data?: { machineIP: string; wasteDate: string }; error?: string }>;
  
  // 系统设置
  getMonthlyRent: () => Promise<{ success: boolean; data?: number; error?: string }>;
  updateMonthlyRent: (rent: number) => Promise<{ success: boolean; error?: string }>;
  
  // 看板数据
  getDashboardStats: (startDate: string, endDate: string, prevStartDate: string, prevEndDate: string) => Promise<{ success: boolean; data?: DashboardStatsData; error?: string }>;
  getDashboardChart: (dates: string[]) => Promise<{ success: boolean; data?: DashboardChartPoint[]; error?: string }>;
  getDashboardPie: (startDate: string, endDate: string) => Promise<{ success: boolean; data?: DashboardPieData[]; error?: string }>;
  syncPrinterData: () => Promise<{ success: boolean; data?: SyncResult; error?: string }>;
  getCloudComparison: (machineIP?: string) => Promise<{ success: boolean; data?: CloudComparisonData; error?: string }>;
  
  // 代码备注管理
  getCodeNotes: (codeType?: 'sp' | 'error') => Promise<{ success: boolean; data?: CodeNote[]; error?: string }>;
  saveCodeNote: (codeType: 'sp' | 'error', code: string, note: string) => Promise<{ success: boolean; error?: string }>;
  importCodeNotes: (notes: { codeType: 'sp' | 'error'; code: string; note: string }[]) => Promise<{ success: boolean; data?: number; error?: string }>;
  
  // 操作人管理
  getOperators: () => Promise<{ success: boolean; data?: Operator[]; error?: string }>;
  addOperator: (name: string) => Promise<{ success: boolean; data?: Operator; error?: string }>;
  updateOperator: (id: number, name: string) => Promise<{ success: boolean; data?: Operator; error?: string }>;
  deleteOperator: (id: number) => Promise<{ success: boolean; error?: string }>;
  
  // 损耗理由管理
  getDamageReasons: () => Promise<{ success: boolean; data?: DamageReason[]; error?: string }>;
  addDamageReason: (reason: string) => Promise<{ success: boolean; data?: DamageReason; error?: string }>;
  updateDamageReason: (id: number, reason: string) => Promise<{ success: boolean; data?: DamageReason; error?: string }>;
  deleteDamageReason: (id: number) => Promise<{ success: boolean; error?: string }>;
  
  // 其他收入明细管理
  getOtherRevenueRecords: (date: string) => Promise<{ success: boolean; data?: OtherRevenueDetail[]; error?: string }>;
  addOtherRevenueRecord: (data: { date: string; amount: number; cost: number; description: string; category: string; operator: string }) => Promise<{ success: boolean; data?: OtherRevenueDetail; error?: string }>;
  deleteOtherRevenueRecord: (id: number) => Promise<{ success: boolean; error?: string }>;
}

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

/** 打印机数据同步结果 */
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  details: { name: string; success: boolean; count?: number; error?: string }[];
}

/** 云端数据对比结果 */
export interface CloudComparisonData {
  day_over_day: { yesterday: number; today: number; change: number; change_percent: number; };
  week_over_week: { last_week: number; this_week: number; change: number; change_percent: number; };
  month_over_month: { last_month: number; this_month: number; change: number; change_percent: number; };
}

/** 代码备注 */
export interface CodeNote {
  id?: number;
  code_type: 'sp' | 'error';
  code: string;
  note: string;
  created_at?: string;
  updated_at?: string;
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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
