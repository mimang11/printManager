/**
 * Dashboard 页面 - BI 数据看板 (云端版)
 * 从 Turso 云端数据库获取数据
 */
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DashboardStatsData, DashboardChartPoint, DashboardPieData } from '../../shared/types';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function Dashboard() {
  const now = new Date();
  
  // 时间选择状态
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');
  
  // 数据状态
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [chartData, setChartData] = useState<DashboardChartPoint[]>([]);
  const [pieData, setPieData] = useState<DashboardPieData[]>([]);
  const [printerNames, setPrinterNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  // 选中的设备
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);

  // 格式化错误信息
  const formatError = (msg?: string): string => {
    if (!msg) return '加载失败，请重试';
    if (msg.includes('fetch failed') || msg.includes('ECONNRESET') || msg.includes('network')) {
      return '网络连接失败，请检查网络后重试';
    }
    if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      return '连接超时，请稍后重试';
    }
    if (msg.includes('unauthorized') || msg.includes('401')) {
      return '认证失败，请检查数据库配置';
    }
    return msg.length > 50 ? '服务器错误，请稍后重试' : msg;
  };

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
      return { start: `${selectedYear}-01-01`, end: `${selectedYear}-12-31` };
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
      return { start: `${selectedYear - 1}-01-01`, end: `${selectedYear - 1}-12-31` };
    }
  };

  // 生成图表日期列表
  const getChartDates = () => {
    const dates: string[] = [];
    if (viewMode === 'day') {
      // 最近7天
      const baseDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
      for (let i = 6; i >= 0; i--) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
    } else if (viewMode === 'month') {
      // 当月每天
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        dates.push(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    } else {
      // 每月第一天（用于年度统计）
      for (let m = 1; m <= 12; m++) {
        const daysInMonth = new Date(selectedYear, m, 0).getDate();
        dates.push(`${selectedYear}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`);
      }
    }
    return dates;
  };

  // 同步打印机数据
  const syncPrinterData = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await window.electronAPI.syncPrinterData();
      if (result.success && result.data) {
        const { synced, failed, details } = result.data;
        if (failed > 0) {
          const failedNames = details.filter(d => !d.success).map(d => d.name).join(', ');
          setSyncMessage(`同步完成: ${synced}台成功, ${failed}台失败 (${failedNames})`);
        } else {
          setSyncMessage(`同步完成: ${synced}台打印机数据已更新`);
        }
      } else {
        setSyncMessage(`同步失败: ${result.error || '未知错误'}`);
      }
    } catch (err: any) {
      setSyncMessage(`同步失败: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getDateRange();
      const prev = getPrevDateRange();
      const chartDates = getChartDates();
      
      // 并行加载所有数据
      const [statsResult, chartResult, pieResult] = await Promise.all([
        window.electronAPI.getDashboardStats(start, end, prev.start, prev.end),
        window.electronAPI.getDashboardChart(chartDates),
        window.electronAPI.getDashboardPie(start, end),
      ]);
      
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      } else if (statsResult.error) {
        setError(formatError(statsResult.error));
      }
      if (chartResult.success && chartResult.data) {
        setChartData(chartResult.data);
        // 提取打印机名称
        const names = new Set<string>();
        chartResult.data.forEach(point => {
          Object.keys(point).forEach(key => {
            if (key !== 'date' && key !== 'count') names.add(key);
          });
        });
        setPrinterNames(Array.from(names));
      }
      if (pieResult.success && pieResult.data) {
        setPieData(pieResult.data);
      }
      
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('加载数据失败:', err);
      setError(formatError(err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth, selectedDay, viewMode]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => i + 1);
  
  const periodLabel = viewMode === 'day' ? '当日' : viewMode === 'month' ? '本月' : '本年';
  const prevLabel = viewMode === 'day' ? '昨日' : viewMode === 'month' ? '上月' : '去年';

  const formatTimestamp = (date: Date) => date.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  // 过滤后的打印机列表（用于柱状图）
  const filteredPrinters = selectedPrinter 
    ? printerNames.filter(n => n === selectedPrinter)
    : printerNames;

  // 饼图点击事件
  const handlePieClick = (data: any) => {
    if (data && data.name) {
      setSelectedPrinter(data.name);
    }
  };

  const resetSelection = () => setSelectedPrinter(null);

  if (loading && !stats) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="page-title">数据看板 <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'normal' }}>(云端)</span></h1>
          {lastUpdate && (
            <span style={{ fontSize: '13px', color: '#6b7280', background: '#f3f4f6',
              padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#22c55e', fontSize: '8px' }}>●</span>
              数据更新于 {formatTimestamp(lastUpdate)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select className="form-input" style={{ width: '120px', minWidth: '120px' }} value={viewMode} onChange={(e) => setViewMode(e.target.value as any)}>
            <option value="day">按日</option>
            <option value="month">按月</option>
            <option value="year">按年</option>
          </select>
          <select className="form-input" style={{ width: '120px', minWidth: '120px' }} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          {viewMode !== 'year' && (
            <select className="form-input" style={{ width: '100px', minWidth: '100px' }} value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {months.map(m => <option key={m} value={m}>{m}月</option>)}
            </select>
          )}
          {viewMode === 'day' && (
            <select className="form-input" style={{ width: '100px', minWidth: '100px' }} value={selectedDay} onChange={(e) => setSelectedDay(Number(e.target.value))}>
              {days.map(d => <option key={d} value={d}>{d}日</option>)}
            </select>
          )}
          <button 
            className="btn btn-secondary" 
            onClick={async () => { await syncPrinterData(); loadData(); }} 
            disabled={syncing || loading}
            title="从打印机抓取最新数据并同步到云端"
          >
            {syncing ? '同步中...' : '🔄 同步数据'}
          </button>
          <button className="btn btn-primary" onClick={loadData} disabled={loading}>
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 同步消息提示 */}
      {syncMessage && (
        <div style={{ 
          marginBottom: '16px', padding: '12px 16px', borderRadius: '12px',
          background: syncMessage.includes('失败') 
            ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
            : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: syncMessage.includes('失败') ? '1px solid #fecaca' : '1px solid #bbf7d0',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <span style={{ fontSize: '18px' }}>{syncMessage.includes('失败') ? '⚠️' : '✅'}</span>
          <span style={{ flex: 1, fontSize: '14px', color: syncMessage.includes('失败') ? '#dc2626' : '#16a34a' }}>
            {syncMessage}
          </span>
          <button 
            onClick={() => setSyncMessage(null)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6b7280' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div style={{ 
          marginBottom: '16px', padding: '16px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>加载失败</div>
            <div style={{ fontSize: '14px', color: '#7f1d1d' }}>{error}</div>
          </div>
          <button className="btn btn-primary" onClick={loadData} style={{ background: '#dc2626' }}>
            重试
          </button>
        </div>
      )}

      {/* KPI 指标卡 */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">{periodLabel}总印量</div>
          <div className="kpi-value">{stats?.totalCount || 0}</div>
          <div className={`kpi-change ${(stats?.countChange || 0) >= 0 ? 'positive' : 'negative'}`}>
            {(stats?.countChange || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats?.countChange || 0)}% 环比{prevLabel}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{periodLabel}预估营收</div>
          <div className="kpi-value">¥{(stats?.totalRevenue || 0).toFixed(2)}</div>
          <div className={`kpi-change ${(stats?.revenueChange || 0) >= 0 ? 'positive' : 'negative'}`}>
            {(stats?.revenueChange || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats?.revenueChange || 0)}% 环比{prevLabel}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {periodLabel}毛利润
            <span title="仅包含：营收 - 耗材成本。未包含房租等固定支出。" style={{ 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '16px', height: '16px', borderRadius: '50%', 
              background: '#e5e7eb', color: '#6b7280', fontSize: '11px', cursor: 'help', fontWeight: 600 
            }}>i</span>
          </div>
          <div className="kpi-value">¥{(stats?.totalProfit || 0).toFixed(2)}</div>
          <div className="kpi-change" style={{ color: '#6b7280' }}>耗材成本: ¥{(stats?.totalCost || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid-2">
        <div className="card" onClick={resetSelection}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {viewMode === 'year' ? '月度印量走势' : viewMode === 'month' ? '本月每日印量' : '近7天印量'}
              {selectedPrinter && <span style={{ color: '#3b82f6', marginLeft: '8px' }}>- {selectedPrinter}</span>}
            </span>
            {selectedPrinter && (
              <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); resetSelection(); }} style={{ fontSize: '12px' }}>
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
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} formatter={(value: number) => [`${value} 张`, '']} />
                <Legend />
                {filteredPrinters.map((name, index) => (
                  <Bar key={name} dataKey={name} fill={COLORS[printerNames.indexOf(name) % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={50} />
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
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                    outerRadius={80} dataKey="value" onClick={handlePieClick} style={{ cursor: 'pointer', outline: 'none' }} isAnimationActive={false}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}
                        stroke={selectedPrinter === entry.name ? '#1f2937' : 'none'} strokeWidth={selectedPrinter === entry.name ? 3 : 0}
                        opacity={selectedPrinter && selectedPrinter !== entry.name ? 0.4 : 1} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} 张`, name]} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">暂无数据</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
