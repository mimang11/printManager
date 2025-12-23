/**
 * Dashboard 页面 - BI 数据看板
 * 支持按年/月/日切换查看数据
 */
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DashboardStats, ChartDataPoint, PieChartData, DailyRevenueDetail, PrinterConfig, DailyRecord } from '../../shared/types';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function Dashboard() {
  const now = new Date();
  
  // 时间选择状态
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('month');
  
  // 数据状态
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // 弹窗状态
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [monthlyDetail, setMonthlyDetail] = useState<DailyRevenueDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null); // 选中的设备ID

  // 加载基础数据
  const loadData = async () => {
    try {
      const [printerList, recordList] = await Promise.all([
        window.electronAPI.getPrinters(),
        window.electronAPI.getRecords(),
      ]);
      setPrinters(printerList);
      setRecords(recordList);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await window.electronAPI.refreshAll();
      await loadData();
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 根据视图模式获取日期范围
  const getDateRange = () => {
    if (viewMode === 'day') {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      return { start: dateStr, end: dateStr };
    } else if (viewMode === 'month') {
      const start = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const end = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      return { start, end };
    } else {
      const start = `${selectedYear}-01-01`;
      const end = `${selectedYear}-12-31`;
      return { start, end };
    }
  };

  // 获取上一期日期范围（用于环比）
  const getPrevDateRange = () => {
    if (viewMode === 'day') {
      const prevDate = new Date(selectedYear, selectedMonth - 1, selectedDay - 1);
      const dateStr = prevDate.toISOString().split('T')[0];
      return { start: dateStr, end: dateStr };
    } else if (viewMode === 'month') {
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
      const start = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      const daysInMonth = new Date(prevYear, prevMonth, 0).getDate();
      const end = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      return { start, end };
    } else {
      const start = `${selectedYear - 1}-01-01`;
      const end = `${selectedYear - 1}-12-31`;
      return { start, end };
    }
  };

  // 过滤记录
  const filterRecords = (start: string, end: string) => {
    return records.filter(r => r.date >= start && r.date <= end);
  };

  // 计算统计数据
  const calculateStats = () => {
    const { start, end } = getDateRange();
    const prevRange = getPrevDateRange();
    
    const currentRecords = filterRecords(start, end);
    const prevRecords = filterRecords(prevRange.start, prevRange.end);
    
    const printerMap = new Map<string, PrinterConfig>();
    printers.forEach(p => printerMap.set(p.id, p));
    
    let totalCount = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    
    currentRecords.forEach(r => {
      const printer = printerMap.get(r.printer_id);
      if (printer) {
        totalCount += r.daily_increment;
        totalRevenue += r.daily_increment * printer.financials.price_per_page;
        totalCost += r.daily_increment * printer.financials.cost_per_page;
      }
    });
    
    let prevCount = 0;
    let prevRevenue = 0;
    prevRecords.forEach(r => {
      const printer = printerMap.get(r.printer_id);
      if (printer) {
        prevCount += r.daily_increment;
        prevRevenue += r.daily_increment * printer.financials.price_per_page;
      }
    });
    
    const countChange = prevCount > 0 ? ((totalCount - prevCount) / prevCount) * 100 : 0;
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    
    return {
      totalCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalProfit: Math.round((totalRevenue - totalCost) * 100) / 100,
      countChange: Math.round(countChange * 10) / 10,
      revenueChange: Math.round(revenueChange * 10) / 10,
    };
  };

  // 计算图表数据
  const calculateChartData = (): ChartDataPoint[] => {
    const result: ChartDataPoint[] = [];
    const printerMap = new Map<string, PrinterConfig>();
    printers.forEach(p => printerMap.set(p.id, p));
    
    if (viewMode === 'day') {
      // 按日视图：显示最近7天
      const baseDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
      for (let i = 0; i < 7; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split('T')[0];
        const dayRecords = records.filter(r => r.date === dateStr);
        
        const dataPoint: ChartDataPoint = {
          date: dateStr.slice(5),
          count: dayRecords.reduce((sum, r) => sum + r.daily_increment, 0),
        };
        printers.forEach(printer => {
          const printerRecords = dayRecords.filter(r => r.printer_id === printer.id);
          dataPoint[printer.alias] = printerRecords.reduce((sum, r) => sum + r.daily_increment, 0);
        });
        result.push(dataPoint);
      }
    } else if (viewMode === 'month') {
      // 按月视图：检测数据密度
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const monthEnd = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const monthRecords = records.filter(r => r.date >= monthStart && r.date <= monthEnd);
      
      // 统计有数据的天数
      const daysWithData = new Set(monthRecords.filter(r => r.daily_increment > 0).map(r => r.date)).size;
      
      // 如果有数据的天数少于7天，显示最近7天
      const showRecentDays = daysWithData < 7;
      const days = showRecentDays ? 7 : daysInMonth;
      const baseDate = showRecentDays 
        ? new Date() // 从今天往前推7天
        : new Date(selectedYear, selectedMonth - 1, 1);
      
      for (let i = 0; i < days; i++) {
        const date = new Date(baseDate);
        if (showRecentDays) {
          date.setDate(date.getDate() - (days - 1 - i));
        } else {
          date.setDate(i + 1);
        }
        const dateStr = date.toISOString().split('T')[0];
        const dayRecords = records.filter(r => r.date === dateStr);
        
        const dataPoint: ChartDataPoint = {
          date: dateStr.slice(5),
          count: dayRecords.reduce((sum, r) => sum + r.daily_increment, 0),
        };
        printers.forEach(printer => {
          const printerRecords = dayRecords.filter(r => r.printer_id === printer.id);
          dataPoint[printer.alias] = printerRecords.reduce((sum, r) => sum + r.daily_increment, 0);
        });
        result.push(dataPoint);
      }
    } else {
      // 年视图：显示每月数据
      for (let month = 1; month <= 12; month++) {
        const start = `${selectedYear}-${String(month).padStart(2, '0')}-01`;
        const daysInMonth = new Date(selectedYear, month, 0).getDate();
        const end = `${selectedYear}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        const monthRecords = filterRecords(start, end);
        
        const dataPoint: ChartDataPoint = {
          date: `${month}月`,
          count: monthRecords.reduce((sum, r) => sum + r.daily_increment, 0),
        };
        printers.forEach(printer => {
          const printerRecords = monthRecords.filter(r => r.printer_id === printer.id);
          dataPoint[printer.alias] = printerRecords.reduce((sum, r) => sum + r.daily_increment, 0);
        });
        result.push(dataPoint);
      }
    }
    
    return result;
  };

  // 计算饼图数据
  const calculatePieData = (): PieChartData[] => {
    const { start, end } = getDateRange();
    const rangeRecords = filterRecords(start, end);
    
    const printerTotals = new Map<string, number>();
    rangeRecords.forEach(r => {
      const current = printerTotals.get(r.printer_id) || 0;
      printerTotals.set(r.printer_id, current + r.daily_increment);
    });
    
    const total = Array.from(printerTotals.values()).reduce((sum, v) => sum + v, 0);
    
    return printers.map(p => {
      const value = printerTotals.get(p.id) || 0;
      return {
        name: p.alias,
        value,
        percentage: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
      };
    }).filter(d => d.value > 0);
  };

  // 加载明细
  const loadMonthlyDetail = async () => {
    setDetailLoading(true);
    try {
      const data = await window.electronAPI.getMonthlyRevenueDetail(selectedYear, selectedMonth);
      setMonthlyDetail(data);
    } catch (error) {
      console.error('加载明细失败:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRevenueClick = () => {
    setShowRevenueModal(true);
    loadMonthlyDetail();
  };

  const handleProfitClick = () => {
    setShowProfitModal(true);
    loadMonthlyDetail();
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  const stats = calculateStats();
  const chartData = calculateChartData();
  const pieData = calculatePieData();
  
  const detailTotals = monthlyDetail.reduce(
    (acc, d) => ({ count: acc.count + d.count, revenue: acc.revenue + d.revenue, cost: acc.cost + d.cost, profit: acc.profit + d.profit }),
    { count: 0, revenue: 0, cost: 0, profit: 0 }
  );

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => i + 1);
  
  const periodLabel = viewMode === 'day' ? '当日' : viewMode === 'month' ? '本月' : '本年';
  const prevLabel = viewMode === 'day' ? '昨日' : viewMode === 'month' ? '上月' : '去年';

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  // 获取选中设备的名称
  const selectedPrinterName = selectedPrinter 
    ? printers.find(p => p.id === selectedPrinter)?.alias 
    : null;

  // 过滤后的打印机列表（用于柱状图）
  const filteredPrinters = selectedPrinter 
    ? printers.filter(p => p.id === selectedPrinter)
    : printers;

  // 饼图点击事件
  const handlePieClick = (data: any) => {
    if (data && data.name) {
      const printer = printers.find(p => p.alias === data.name);
      if (printer) {
        setSelectedPrinter(printer.id);
      }
    }
  };

  // 重置选择
  const resetSelection = () => {
    setSelectedPrinter(null);
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="page-title">数据看板</h1>
          {lastUpdate && (
            <span style={{
              fontSize: '13px', color: '#6b7280', background: '#f3f4f6',
              padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <span style={{ color: '#22c55e', fontSize: '8px' }}>●</span>
              数据更新于 {formatTimestamp(lastUpdate)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select className="form-input" style={{ width: '100px', minWidth: '100px' }} value={viewMode} onChange={(e) => setViewMode(e.target.value as any)}>
            <option value="day">按日</option>
            <option value="month">按月</option>
            <option value="year">按年</option>
          </select>
          <select className="form-input" style={{ width: '120px', minWidth: '120px' }} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          {viewMode !== 'year' && (
            <select className="form-input" style={{ width: '90px', minWidth: '90px' }} value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {months.map(m => <option key={m} value={m}>{m}月</option>)}
            </select>
          )}
          {viewMode === 'day' && (
            <select className="form-input" style={{ width: '90px', minWidth: '90px' }} value={selectedDay} onChange={(e) => setSelectedDay(Number(e.target.value))}>
              {days.map(d => <option key={d} value={d}>{d}日</option>)}
            </select>
          )}
          <button className="btn btn-primary" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* KPI 指标卡 */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">{periodLabel}总印量</div>
          <div className="kpi-value">{stats.totalCount}</div>
          <div className={`kpi-change ${stats.countChange >= 0 ? 'positive' : 'negative'}`}>
            {stats.countChange >= 0 ? '↑' : '↓'} {Math.abs(stats.countChange)}% 环比{prevLabel}
          </div>
        </div>
        <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={handleRevenueClick}>
          <div className="kpi-label">{periodLabel}预估营收 <span style={{ fontSize: '12px', color: '#3b82f6' }}>(点击明细)</span></div>
          <div className="kpi-value">¥{stats.totalRevenue.toFixed(2)}</div>
          <div className={`kpi-change ${stats.revenueChange >= 0 ? 'positive' : 'negative'}`}>
            {stats.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueChange)}% 环比{prevLabel}
          </div>
        </div>
        <div className="kpi-card" style={{ cursor: 'pointer', position: 'relative' }} onClick={handleProfitClick}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {periodLabel}毛利润
            <span 
              title="仅包含：营收 - 耗材成本。未包含房租等固定支出。查看净利润请前往「营收管理」页面。"
              style={{ 
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '16px', height: '16px', borderRadius: '50%', 
                background: '#e5e7eb', color: '#6b7280', fontSize: '11px', 
                cursor: 'help', fontWeight: 600 
              }}
            >i</span>
            <span style={{ fontSize: '12px', color: '#3b82f6' }}>(点击明细)</span>
          </div>
          <div className="kpi-value">¥{stats.totalProfit.toFixed(2)}</div>
          <div className="kpi-change" style={{ color: '#6b7280' }}>耗材成本: ¥{stats.totalCost.toFixed(2)}</div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid-2">
        <div className="card" onClick={resetSelection}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {viewMode === 'year' ? '月度印量走势' : viewMode === 'month' ? '本月每日印量' : '近7天印量'}
              {selectedPrinterName && <span style={{ color: '#3b82f6', marginLeft: '8px' }}>- {selectedPrinterName}</span>}
            </span>
            {selectedPrinter && (
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={(e) => { e.stopPropagation(); resetSelection(); }}
                style={{ fontSize: '12px' }}
              >
                显示全部设备
              </button>
            )}
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value: number) => [`${value} 张`, '']}
                />
                <Legend />
                {filteredPrinters.map((printer, index) => (
                  <Bar 
                    key={printer.id} 
                    dataKey={printer.alias} 
                    fill={COLORS[printers.findIndex(p => p.id === printer.id) % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                    minPointSize={3}
                    maxBarSize={50}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            {periodLabel}设备贡献占比
            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>(点击扇区筛选)</span>
          </div>
          <div className="chart-container">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieData} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80} 
                    dataKey="value"
                    onClick={handlePieClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {pieData.map((entry, index) => {
                      const printer = printers.find(p => p.alias === entry.name);
                      const isSelected = selectedPrinter && printer?.id === selectedPrinter;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          stroke={isSelected ? '#1f2937' : 'none'}
                          strokeWidth={isSelected ? 3 : 0}
                          opacity={selectedPrinter && !isSelected ? 0.4 : 1}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} 张`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">暂无数据</div>
            )}
          </div>
        </div>
      </div>

      {/* 营收明细弹窗 */}
      {showRevenueModal && (
        <div className="modal-overlay" onClick={() => setShowRevenueModal(false)}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedYear}年{selectedMonth}月营收明细</h2>
              <button className="modal-close" onClick={() => setShowRevenueModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {detailLoading ? <div className="loading">加载中...</div> : (
                <table className="table">
                  <thead><tr><th>日期</th><th>印量</th><th>营收</th></tr></thead>
                  <tbody>
                    {monthlyDetail.filter(d => d.count > 0).map((d) => (
                      <tr key={d.date}><td>{d.date}</td><td>{d.count}</td><td style={{ color: '#22c55e' }}>¥{d.revenue.toFixed(2)}</td></tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', background: '#f3f4f6' }}>
                      <td>合计</td><td>{detailTotals.count}</td><td style={{ color: '#22c55e' }}>¥{detailTotals.revenue.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 利润明细弹窗 */}
      {showProfitModal && (
        <div className="modal-overlay" onClick={() => setShowProfitModal(false)}>
          <div className="modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedYear}年{selectedMonth}月利润明细</h2>
              <button className="modal-close" onClick={() => setShowProfitModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {detailLoading ? <div className="loading">加载中...</div> : (
                <table className="table">
                  <thead><tr><th>日期</th><th>印量</th><th>营收</th><th>成本</th><th>利润</th></tr></thead>
                  <tbody>
                    {monthlyDetail.filter(d => d.count > 0).map((d) => (
                      <tr key={d.date}>
                        <td>{d.date}</td><td>{d.count}</td><td>¥{d.revenue.toFixed(2)}</td>
                        <td style={{ color: '#ef4444' }}>¥{d.cost.toFixed(2)}</td>
                        <td style={{ color: d.profit >= 0 ? '#22c55e' : '#ef4444' }}>¥{d.profit.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', background: '#f3f4f6' }}>
                      <td>合计</td><td>{detailTotals.count}</td><td>¥{detailTotals.revenue.toFixed(2)}</td>
                      <td style={{ color: '#ef4444' }}>¥{detailTotals.cost.toFixed(2)}</td>
                      <td style={{ color: detailTotals.profit >= 0 ? '#22c55e' : '#ef4444' }}>¥{detailTotals.profit.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
