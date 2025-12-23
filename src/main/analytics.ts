/**
 * ============================================
 * 数据分析模块 - BI 看板计算
 * ============================================
 * 计算各种统计数据、图表数据和对比数据
 */

import { PrinterConfig, DailyRecord, DashboardStats, ChartDataPoint, PieChartData, ComparisonData, DailyRevenueDetail, MonthlyRevenueData, PrinterDailyData, OtherRevenue } from '../shared/types';

/**
 * 计算公式 - 支持自定义公式
 * 变量: count (打印数量)
 */
function evaluateFormula(formula: string | undefined, count: number, defaultValue: number): number {
  if (!formula) {
    return count * defaultValue;
  }
  try {
    // 替换变量
    const expression = formula.replace(/count/gi, count.toString());
    // 安全计算 (只允许数字和基本运算符)
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return count * defaultValue;
    }
    const result = Function('"use strict"; return (' + expression + ')')();
    return typeof result === 'number' && !isNaN(result) ? result : count * defaultValue;
  } catch {
    return count * defaultValue;
  }
}

/**
 * 计算打印机的收益和成本
 */
function calculatePrinterFinancials(printer: PrinterConfig, count: number): { revenue: number; cost: number } {
  const revenue = evaluateFormula(
    printer.financials.revenue_formula, 
    count, 
    printer.financials.price_per_page
  );
  const cost = evaluateFormula(
    printer.financials.cost_formula, 
    count, 
    printer.financials.cost_per_page
  );
  return { revenue, cost };
}

/**
 * 获取日期字符串 (YYYY-MM-DD)
 */
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 获取今天的日期字符串
 */
function getTodayString(): string {
  return getDateString(new Date());
}

/**
 * 获取昨天的日期字符串
 */
function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateString(yesterday);
}

/**
 * 获取本月第一天
 */
function getMonthStart(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * 获取上月第一天和最后一天
 */
function getLastMonthRange(): { start: string; end: string } {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: getDateString(lastMonth),
    end: getDateString(lastMonthEnd),
  };
}

/**
 * 计算看板统计数据 - 按每台机器单独计算营收后汇总
 */
export function calculateDashboardStats(
  printers: PrinterConfig[],
  records: DailyRecord[]
): DashboardStats {
  const today = getTodayString();
  const yesterday = getYesterdayString();
  const monthStart = getMonthStart(new Date());
  const lastMonthRange = getLastMonthRange();

  // 今日总印量
  const todayRecords = records.filter(r => r.date === today);
  const todayTotal = todayRecords.reduce((sum, r) => sum + r.daily_increment, 0);

  // 昨日总印量
  const yesterdayRecords = records.filter(r => r.date === yesterday);
  const yesterdayTotal = yesterdayRecords.reduce((sum, r) => sum + r.daily_increment, 0);

  // 环比昨日变化
  const todayChangePercent = yesterdayTotal > 0 
    ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 
    : 0;

  // 本月累计 - 按每台机器单独计算
  const thisMonthRecords = records.filter(r => r.date >= monthStart);
  let monthRevenue = 0;
  let monthCost = 0;

  // 创建打印机配置映射
  const printerMap = new Map<string, PrinterConfig>();
  printers.forEach(p => printerMap.set(p.id, p));

  // 按每台机器计算
  thisMonthRecords.forEach(r => {
    const printer = printerMap.get(r.printer_id);
    if (printer) {
      const { revenue, cost } = calculatePrinterFinancials(printer, r.daily_increment);
      monthRevenue += revenue;
      monthCost += cost;
    }
  });

  const monthProfit = monthRevenue - monthCost;

  // 上月营收 - 同样按每台机器计算
  const lastMonthRecords = records.filter(r => 
    r.date >= lastMonthRange.start && r.date <= lastMonthRange.end
  );
  let lastMonthRevenue = 0;
  lastMonthRecords.forEach(r => {
    const printer = printerMap.get(r.printer_id);
    if (printer) {
      const { revenue } = calculatePrinterFinancials(printer, r.daily_increment);
      lastMonthRevenue += revenue;
    }
  });

  const monthChangePercent = lastMonthRevenue > 0 
    ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
    : 0;

  return {
    today_total: todayTotal,
    today_change_percent: Math.round(todayChangePercent * 10) / 10,
    month_revenue: Math.round(monthRevenue * 100) / 100,
    month_change_percent: Math.round(monthChangePercent * 10) / 10,
    month_profit: Math.round(monthProfit * 100) / 100,
    month_cost: Math.round(monthCost * 100) / 100,
  };
}

/**
 * 计算图表数据 (近 N 天印量走势) - 按设备分组
 */
export function calculateChartData(
  records: DailyRecord[], 
  days: number,
  printers: PrinterConfig[] = []
): ChartDataPoint[] {
  const result: ChartDataPoint[] = [];
  const today = new Date();

  // 创建打印机名称映射
  const printerNameMap = new Map<string, string>();
  printers.forEach(p => printerNameMap.set(p.id, p.alias));

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getDateString(date);

    const dayRecords = records.filter(r => r.date === dateStr);
    const totalCount = dayRecords.reduce((sum, r) => sum + r.daily_increment, 0);

    const dataPoint: ChartDataPoint = {
      date: dateStr.slice(5), // 只显示 MM-DD
      count: totalCount,
    };

    // 按每台设备添加数据
    printers.forEach(printer => {
      const printerRecords = dayRecords.filter(r => r.printer_id === printer.id);
      const printerCount = printerRecords.reduce((sum, r) => sum + r.daily_increment, 0);
      dataPoint[printer.alias] = printerCount;
    });

    result.push(dataPoint);
  }

  return result;
}

/**
 * 计算饼图数据 (设备贡献占比)
 */
export function calculatePieChartData(
  printers: PrinterConfig[],
  records: DailyRecord[]
): PieChartData[] {
  const monthStart = getMonthStart(new Date());
  const thisMonthRecords = records.filter(r => r.date >= monthStart);

  // 按打印机统计本月印量
  const printerTotals = new Map<string, number>();
  thisMonthRecords.forEach(r => {
    const current = printerTotals.get(r.printer_id) || 0;
    printerTotals.set(r.printer_id, current + r.daily_increment);
  });

  // 计算总量
  const total = Array.from(printerTotals.values()).reduce((sum, v) => sum + v, 0);

  // 生成饼图数据
  return printers.map(p => {
    const value = printerTotals.get(p.id) || 0;
    return {
      name: p.alias,
      value,
      percentage: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
    };
  }).filter(d => d.value > 0);
}

/**
 * 计算对比数据
 */
export function calculateComparisonData(
  records: DailyRecord[],
  printerId?: string
): ComparisonData {
  // 过滤特定打印机的记录
  const filteredRecords = printerId 
    ? records.filter(r => r.printer_id === printerId)
    : records;

  const today = getTodayString();
  const yesterday = getYesterdayString();

  // 日对比
  const todayTotal = filteredRecords
    .filter(r => r.date === today)
    .reduce((sum, r) => sum + r.daily_increment, 0);
  const yesterdayTotal = filteredRecords
    .filter(r => r.date === yesterday)
    .reduce((sum, r) => sum + r.daily_increment, 0);

  // 周对比
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

  const thisWeekTotal = filteredRecords
    .filter(r => r.date >= getDateString(thisWeekStart))
    .reduce((sum, r) => sum + r.daily_increment, 0);
  const lastWeekTotal = filteredRecords
    .filter(r => r.date >= getDateString(lastWeekStart) && r.date <= getDateString(lastWeekEnd))
    .reduce((sum, r) => sum + r.daily_increment, 0);

  // 月对比
  const monthStart = getMonthStart(now);
  const lastMonthRange = getLastMonthRange();

  const thisMonthTotal = filteredRecords
    .filter(r => r.date >= monthStart)
    .reduce((sum, r) => sum + r.daily_increment, 0);
  const lastMonthTotal = filteredRecords
    .filter(r => r.date >= lastMonthRange.start && r.date <= lastMonthRange.end)
    .reduce((sum, r) => sum + r.daily_increment, 0);

  return {
    day_over_day: {
      yesterday: yesterdayTotal,
      today: todayTotal,
      change: todayTotal - yesterdayTotal,
      change_percent: yesterdayTotal > 0 ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 1000) / 10 : 0,
    },
    week_over_week: {
      last_week: lastWeekTotal,
      this_week: thisWeekTotal,
      change: thisWeekTotal - lastWeekTotal,
      change_percent: lastWeekTotal > 0 ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 1000) / 10 : 0,
    },
    month_over_month: {
      last_month: lastMonthTotal,
      this_month: thisMonthTotal,
      change: thisMonthTotal - lastMonthTotal,
      change_percent: lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 1000) / 10 : 0,
    },
  };
}

/**
 * 计算月度每日营收明细 - 按每台机器单独计算后汇总
 */
export function calculateMonthlyRevenueDetail(
  printers: PrinterConfig[],
  records: DailyRecord[],
  year: number,
  month: number
): DailyRevenueDetail[] {
  const printerMap = new Map<string, PrinterConfig>();
  printers.forEach(p => printerMap.set(p.id, p));

  const daysInMonth = new Date(year, month, 0).getDate();
  const result: DailyRevenueDetail[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayRecords = records.filter(r => r.date === dateStr);
    
    let count = 0;
    let revenue = 0;
    let cost = 0;

    dayRecords.forEach(r => {
      const printer = printerMap.get(r.printer_id);
      if (printer) {
        count += r.daily_increment;
        const financials = calculatePrinterFinancials(printer, r.daily_increment);
        revenue += financials.revenue;
        cost += financials.cost;
      }
    });

    const profit = Math.round((revenue - cost) * 100) / 100;
    result.push({ 
      date: dateStr, 
      count, 
      revenue: Math.round(revenue * 100) / 100, 
      cost: Math.round(cost * 100) / 100, 
      profit 
    });
  }

  return result;
}

/**
 * 计算月度营收数据 - 包含每台机器明细
 */
export function calculateMonthlyRevenueData(
  printers: PrinterConfig[],
  records: DailyRecord[],
  otherRevenues: OtherRevenue[],
  year: number,
  month: number,
  defaultRent: number = -150
): MonthlyRevenueData[] {
  const printerMap = new Map<string, PrinterConfig>();
  printers.forEach(p => printerMap.set(p.id, p));

  const daysInMonth = new Date(year, month, 0).getDate();
  const result: MonthlyRevenueData[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayRecords = records.filter(r => r.date === dateStr);
    
    // 每台打印机的数据
    const printerDataList: PrinterDailyData[] = printers.map(printer => {
      const printerRecords = dayRecords.filter(r => r.printer_id === printer.id);
      const count = printerRecords.reduce((sum, r) => sum + r.daily_increment, 0);
      const financials = calculatePrinterFinancials(printer, count);
      const revenue = Math.round(financials.revenue * 100) / 100;
      const cost = Math.round(financials.cost * 100) / 100;
      const profit = Math.round((revenue - cost) * 100) / 100;
      
      return {
        printerId: printer.id,
        printerName: printer.alias,
        count,
        cost,
        revenue,
        profit,
      };
    });

    // 其他收入
    const dayOtherRevenues = otherRevenues.filter(r => r.date === dateStr);
    const otherIncome = dayOtherRevenues.reduce((sum, r) => sum + r.amount, 0);
    const otherIncomeNote = dayOtherRevenues.map(r => r.description).filter(d => d).join('; ');

    // 计算汇总
    const totalPrinterRevenue = printerDataList.reduce((sum, p) => sum + p.revenue, 0);
    const totalPrinterCost = printerDataList.reduce((sum, p) => sum + p.cost, 0);
    const totalRevenue = Math.round((totalPrinterRevenue + otherIncome) * 100) / 100;
    const netProfit = Math.round((totalPrinterRevenue - totalPrinterCost + otherIncome + defaultRent) * 100) / 100;

    result.push({
      date: dateStr,
      printers: printerDataList,
      otherIncome: Math.round(otherIncome * 100) / 100,
      otherIncomeNote,
      rent: defaultRent,
      totalRevenue,
      netProfit,
    });
  }

  return result;
}
