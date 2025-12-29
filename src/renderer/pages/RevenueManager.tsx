/**
 * RevenueManager 页面 - 营收管理 (云端版)
 * 从 Turso 云端数据库获取营收数据
 */
import React, { useState, useEffect } from 'react';
import { CloudMonthlyRevenueData, WasteRecordDetail } from '../../shared/types';

function RevenueManager() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [filterDay, setFilterDay] = useState<number | null>(null); // 日期筛选
  const [revenueData, setRevenueData] = useState<CloudMonthlyRevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [includeFixedCost, setIncludeFixedCost] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // 默认倒序
  
  // 月租金
  const [monthlyRent, setMonthlyRent] = useState(150);
  const [showRentModal, setShowRentModal] = useState(false);
  const [editingRent, setEditingRent] = useState(150);
  
  // 其他收入弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [otherAmount, setOtherAmount] = useState(0);
  const [otherNote, setOtherNote] = useState('');

  // 损耗上报弹窗
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteDate, setWasteDate] = useState('');
  const [wastePrinterId, setWastePrinterId] = useState('');
  const [wastePrinterName, setWastePrinterName] = useState('');
  const [wasteMaxCount, setWasteMaxCount] = useState(0);
  const [wasteRecords, setWasteRecords] = useState<WasteRecordDetail[]>([]);
  const [newWasteCount, setNewWasteCount] = useState(0);
  const [newWasteNote, setNewWasteNote] = useState('');
  const [newWasteOperator, setNewWasteOperator] = useState('');
  const [wasteLoading, setWasteLoading] = useState(false);

  // 加载月租金
  const loadRent = async () => {
    try {
      const result = await window.electronAPI.getMonthlyRent();
      if (result.success && result.data !== undefined) {
        setMonthlyRent(result.data);
        setEditingRent(result.data);
      }
    } catch (err) {
      console.error('加载月租金失败:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.getCloudMonthlyRevenue(year, month);
      if (result.success && result.data) {
        setRevenueData(result.data);
        setLastUpdate(new Date());
      } else {
        setError(formatError(result.error));
      }
    } catch (err: any) {
      setError(formatError(err.message));
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => { loadRent(); }, []);
  useEffect(() => { loadData(); setFilterDay(null); }, [year, month]);

  const handleAddOther = async () => {
    if (!selectedDate) return;
    try {
      const result = await window.electronAPI.addCloudOtherRevenue({
        date: selectedDate, amount: otherAmount,
        description: otherNote, category: '其他',
      });
      if (result.success) {
        setShowAddModal(false);
        setOtherAmount(0);
        setOtherNote('');
        loadData();
      } else {
        alert('添加失败: ' + result.error);
      }
    } catch (err: any) {
      alert('添加失败: ' + err.message);
    }
  };

  // 打开损耗上报弹窗
  const openWasteModal = async (date: string, printerId: string, printerName: string, maxCount: number, currentWaste: number) => {
    setWasteDate(date);
    setWastePrinterId(printerId);
    setWastePrinterName(printerName);
    setWasteMaxCount(maxCount);
    setNewWasteCount(0);
    setNewWasteNote('');
    setNewWasteOperator('');
    setShowWasteModal(true);
    
    // 加载已有的损耗记录
    setWasteLoading(true);
    try {
      const result = await window.electronAPI.getWasteRecords(printerId, date);
      if (result.success && result.data) {
        setWasteRecords(result.data);
      } else {
        setWasteRecords([]);
      }
    } catch (err) {
      console.error('加载损耗记录失败:', err);
      setWasteRecords([]);
    } finally {
      setWasteLoading(false);
    }
  };

  // 添加损耗记录
  const handleAddWaste = async () => {
    if (newWasteCount <= 0) {
      alert('请输入损耗数量');
      return;
    }
    if (!newWasteOperator.trim()) {
      alert('请输入操作人');
      return;
    }
    
    try {
      const result = await window.electronAPI.addWasteRecord({
        machineIP: wastePrinterId,
        wasteDate: wasteDate,
        wasteCount: newWasteCount,
        note: newWasteNote,
        operator: newWasteOperator.trim(),
      });
      if (result.success && result.data) {
        setWasteRecords([result.data, ...wasteRecords]);
        setNewWasteCount(0);
        setNewWasteNote('');
        loadData(); // 刷新主数据
      } else {
        alert('添加失败: ' + result.error);
      }
    } catch (err: any) {
      alert('添加失败: ' + err.message);
    }
  };

  // 删除损耗记录
  const handleDeleteWaste = async (id: number) => {
    if (!confirm('确定删除此损耗记录？')) return;
    
    try {
      const result = await window.electronAPI.deleteWasteRecord(id);
      if (result.success) {
        setWasteRecords(wasteRecords.filter(r => r.id !== id));
        loadData(); // 刷新主数据
      } else {
        alert('删除失败: ' + result.error);
      }
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
  };

  // 计算当前总损耗
  const currentTotalWaste = wasteRecords.reduce((sum, r) => sum + r.waste_count, 0);

  // 保存月租金
  const handleSaveRent = async () => {
    try {
      const result = await window.electronAPI.updateMonthlyRent(editingRent);
      if (result.success) {
        setMonthlyRent(editingRent);
        setShowRentModal(false);
      } else {
        alert('保存失败: ' + result.error);
      }
    } catch (err: any) {
      alert('保存失败: ' + err.message);
    }
  };

  const toggleRow = (date: string) => {
    const newSet = new Set(expandedRows);
    newSet.has(date) ? newSet.delete(date) : newSet.add(date);
    setExpandedRows(newSet);
  };

  const expandAll = () => setExpandedRows(new Set(filteredData.map(d => d.date)));
  const collapseAll = () => setExpandedRows(new Set());

  // 根据日期筛选数据并排序
  const filteredData = revenueData.filter(d => {
    const hasData = d.printers.some(p => p.count > 0) || d.otherIncome !== 0;
    if (!hasData) return false;
    if (filterDay !== null) {
      const dayNum = parseInt(d.date.split('-')[2]);
      return dayNum === filterDay;
    }
    return true;
  }).sort((a, b) => {
    return sortOrder === 'desc' 
      ? b.date.localeCompare(a.date) 
      : a.date.localeCompare(b.date);
  });

  // 计算月度汇总（基于筛选后的数据）
  const monthTotals = filteredData.reduce((acc, day) => {
    const printerRevenue = day.printers.reduce((sum, p) => sum + p.revenue, 0);
    const printerCost = day.printers.reduce((sum, p) => sum + p.cost, 0);
    const totalCount = day.printers.reduce((sum, p) => sum + p.count, 0);
    const wasteCount = day.printers.reduce((sum, p) => sum + p.wasteCount, 0);
    return {
      totalRevenue: acc.totalRevenue + printerRevenue,
      totalCost: acc.totalCost + printerCost,
      otherIncome: acc.otherIncome + day.otherIncome,
      netProfit: acc.netProfit + day.netProfit,
      totalCount: acc.totalCount + totalCount,
      wasteCount: acc.wasteCount + wasteCount,
    };
  }, { totalRevenue: 0, totalCost: 0, otherIncome: 0, netProfit: 0, totalCount: 0, wasteCount: 0 });

  // 计算损耗金额（损耗数量 * 平均单价）
  const avgPrice = monthTotals.totalCount > 0 ? monthTotals.totalRevenue / (monthTotals.totalCount + monthTotals.wasteCount - monthTotals.wasteCount) : 0;
  // 从打印机配置获取平均售价来计算损耗金额
  const wasteCost = filteredData.reduce((acc, day) => {
    return acc + day.printers.reduce((sum, p) => {
      // 损耗金额 = 损耗数量 * 该打印机的单价 (revenue / (count + wasteCount - wasteCount))
      const unitPrice = p.count > 0 ? p.revenue / p.count : 0;
      return sum + p.wasteCount * unitPrice;
    }, 0);
  }, 0);

  // 使用云端月租金
  const fixedCost = monthlyRent;
  
  // 总成本 = 耗材成本 + 损耗损失 + 房租
  const totalAllCost = monthTotals.totalCost + wasteCost + fixedCost;
  
  // 盈亏平衡分析 - 考虑损耗
  // 有效印量 = 总印量 - 损耗
  const effectiveCount = monthTotals.totalCount - monthTotals.wasteCount;
  // 平均单张利润 = (营收 - 耗材成本) / 有效印量
  const avgProfitPerPage = effectiveCount > 0 
    ? (monthTotals.totalRevenue - monthTotals.totalCost) / effectiveCount : 0;
  // 当前利润 = 营收 - 耗材成本 - 损耗损失 - 房租 + 其他收入
  const currentProfit = monthTotals.totalRevenue - monthTotals.totalCost - wasteCost - fixedCost + monthTotals.otherIncome;
  // 回本所需印量 = (房租 + 损耗损失) / 平均单张利润
  const breakEvenPages = avgProfitPerPage > 0 ? Math.ceil((fixedCost + wasteCost) / avgProfitPerPage) : 0;
  const pagesNeeded = avgProfitPerPage > 0 && currentProfit < 0 ? Math.ceil(Math.abs(currentProfit) / avgProfitPerPage) : 0;
  const breakEvenProgress = breakEvenPages > 0 ? Math.min((effectiveCount / breakEvenPages) * 100, 100) : 0;
  const isBreakEven = currentProfit >= 0;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyRent = fixedCost / daysInMonth;

  const formatTimestamp = (date: Date) => date.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
    background: '#1f2937', color: 'white', padding: '8px 12px', borderRadius: '8px',
    fontSize: '12px', whiteSpace: 'nowrap', zIndex: 100, marginTop: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  };

  // 生成日期选项
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="page-title">营收管理 <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'normal' }}>(云端)</span></h1>
          {lastUpdate && (
            <span style={{ fontSize: '13px', color: '#6b7280', background: '#f3f4f6',
              padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#22c55e', fontSize: '8px' }}>●</span>
              数据更新于 {formatTimestamp(lastUpdate)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select className="form-input" style={{ width: '120px', minWidth: '120px' }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select className="form-input" style={{ width: '100px', minWidth: '100px' }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {months.map(m => <option key={m} value={m}>{m}月</option>)}
          </select>
          <button className="btn btn-primary" onClick={loadData} disabled={loading}>
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>
      </div>

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

      {/* 月度汇总卡片 */}
      <div className="kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-label">本月总营业额</div>
          <div className="kpi-value">¥{(monthTotals.totalRevenue + monthTotals.otherIncome).toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">本月总成本</div>
          <div className="kpi-value" style={{ color: '#ef4444' }}>¥{totalAllCost.toFixed(2)}</div>
          <div className="kpi-change" style={{ color: '#6b7280', fontSize: '12px' }}>
            耗材 ¥{monthTotals.totalCost.toFixed(0)} + 损耗 ¥{wasteCost.toFixed(0)} + 房租 ¥{fixedCost.toFixed(0)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">本月损耗</div>
          <div className="kpi-value" style={{ color: '#f59e0b' }}>{monthTotals.wasteCount} 张</div>
          <div className="kpi-change" style={{ color: '#ef4444' }}>损失 ¥{wasteCost.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">本月其他收入</div>
          <div className="kpi-value" style={{ color: '#22c55e' }}>¥{monthTotals.otherIncome.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">本月纯利润</div>
          <div className="kpi-value" style={{ color: currentProfit >= 0 ? '#22c55e' : '#ef4444' }}>
            ¥{currentProfit.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 盈亏平衡分析 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📊 盈亏平衡分析</span>
          <button 
            className="btn btn-sm btn-secondary" 
            onClick={() => { setEditingRent(monthlyRent); setShowRentModal(true); }}
            style={{ fontSize: '12px' }}
          >
            ⚙️ 设置房租 (¥{monthlyRent})
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center' }}>
          <div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>固定成本（房租）：</span>
              <span style={{ fontWeight: 600, color: '#ef4444' }}>¥{fixedCost.toFixed(0)}</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>耗材成本：</span>
              <span style={{ fontWeight: 600, color: '#ef4444' }}>¥{monthTotals.totalCost.toFixed(2)}</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>损耗损失：</span>
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>¥{wasteCost.toFixed(2)}</span>
              <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '4px' }}>({monthTotals.wasteCount}张)</span>
            </div>
            <div style={{ marginBottom: '12px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>总成本合计：</span>
              <span style={{ fontWeight: 700, color: '#dc2626' }}>¥{totalAllCost.toFixed(2)}</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>平均单张利润：</span>
              <span style={{ fontWeight: 600, color: '#3b82f6' }}>¥{avgProfitPerPage.toFixed(3)}</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>回本所需印量：</span>
              <span style={{ fontWeight: 600 }}>{breakEvenPages.toLocaleString()} 张</span>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>有效印量：</span>
              <span style={{ fontWeight: 600, color: '#22c55e' }}>{effectiveCount.toLocaleString()} 张</span>
              <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '4px' }}>(总{monthTotals.totalCount.toLocaleString()}张)</span>
            </div>
          </div>
          <div>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '15px' }}>回本进度</span>
              <span style={{ 
                fontWeight: 700, fontSize: '18px', 
                color: isBreakEven ? '#22c55e' : '#f59e0b' 
              }}>
                {breakEvenProgress.toFixed(1)}%
              </span>
            </div>
            <div style={{ 
              height: '24px', background: '#e5e7eb', borderRadius: '12px', 
              overflow: 'hidden', position: 'relative' 
            }}>
              <div style={{
                height: '100%', borderRadius: '12px',
                background: isBreakEven 
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)' 
                  : 'linear-gradient(90deg, #f59e0b, #eab308)',
                width: `${breakEvenProgress}%`,
                transition: 'width 0.5s ease',
              }} />
              {breakEvenProgress >= 100 && (
                <span style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  color: 'white', fontSize: '12px', fontWeight: 600
                }}>✓ 已回本</span>
              )}
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              {isBreakEven ? (
                <span style={{ 
                  color: '#22c55e', fontWeight: 600, fontSize: '16px',
                  background: '#dcfce7', padding: '8px 16px', borderRadius: '8px'
                }}>
                  🎉 本月已回本，盈利 ¥{currentProfit.toFixed(2)}
                </span>
              ) : (
                <span style={{ 
                  color: '#f59e0b', fontWeight: 600, fontSize: '15px',
                  background: '#fef3c7', padding: '8px 16px', borderRadius: '8px'
                }}>
                  距离回本还差 <strong style={{ color: '#ef4444' }}>{pagesNeeded.toLocaleString()}</strong> 张
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 每日明细表格 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>每日营收明细</div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* 排序切换 */}
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {sortOrder === 'desc' ? '📅 最新在前' : '📅 最早在前'}
            </button>
            {/* 固定成本分摊开关 */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
              <div 
                onClick={() => setIncludeFixedCost(!includeFixedCost)}
                style={{
                  width: '44px', height: '24px', borderRadius: '12px',
                  background: includeFixedCost ? 'linear-gradient(90deg, #3b82f6, #2563eb)' : '#d1d5db',
                  position: 'relative', transition: 'all 0.3s ease', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                  position: 'absolute', top: '2px', left: includeFixedCost ? '22px' : '2px',
                  transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </div>
              <span style={{ color: includeFixedCost ? '#3b82f6' : '#6b7280', fontWeight: 500 }}>
                包含固定成本分摊
              </span>
              {includeFixedCost && (
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  (¥{dailyRent.toFixed(2)}/天)
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-sm btn-secondary" onClick={expandAll}>全部展开</button>
              <button className="btn btn-sm btn-secondary" onClick={collapseAll}>全部折叠</button>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>日期</th>
                <th>营业额</th>
                <th>总成本</th>
                <th>其他收入</th>
                <th>纯利润</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((day) => {
                const dayRevenue = day.printers.reduce((sum, p) => sum + p.revenue, 0);
                const dayCost = day.printers.reduce((sum, p) => sum + p.cost, 0);
                // 根据开关决定是否包含固定成本分摊
                const totalCost = includeFixedCost ? dayCost + dailyRent : dayCost;
                const dayNetProfit = includeFixedCost 
                  ? dayRevenue + day.otherIncome - dayCost - dailyRent 
                  : dayRevenue + day.otherIncome - dayCost;
                const isExpanded = expandedRows.has(day.date);
                
                return (
                  <React.Fragment key={day.date}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => toggleRow(day.date)}>
                      <td style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                        {isExpanded ? '▼' : '▶'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{day.date.slice(5)}</td>
                      <td style={{ fontWeight: 500 }}>¥{(dayRevenue + day.otherIncome).toFixed(2)}</td>
                      <td style={{ position: 'relative' }} className="tooltip-trigger">
                        <span style={{ color: '#ef4444', cursor: 'help' }}>¥{totalCost.toFixed(2)}</span>
                        <div className="tooltip-content" style={tooltipStyle}>
                          耗材成本: ¥{dayCost.toFixed(2)}
                          {includeFixedCost && <><br/>房租分摊: ¥{dailyRent.toFixed(2)}</>}
                        </div>
                      </td>
                      <td>
                        {day.otherIncome !== 0 ? (
                          <span title={day.otherIncomeNote} style={{ color: '#3b82f6', cursor: 'help' }}>
                            ¥{day.otherIncome.toFixed(2)}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ position: 'relative' }} className="tooltip-trigger">
                        <span style={{ color: dayNetProfit >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600, cursor: 'help' }}>
                          ¥{dayNetProfit.toFixed(2)}
                        </span>
                        <div className="tooltip-content" style={tooltipStyle}>
                          营业额: ¥{(dayRevenue + day.otherIncome).toFixed(2)}<br/>
                          - 耗材: ¥{dayCost.toFixed(2)}<br/>
                          {includeFixedCost && <>- 房租分摊: ¥{dailyRent.toFixed(2)}<br/></>}
                          = 纯利润: ¥{dayNetProfit.toFixed(2)}
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setSelectedDate(day.date); setShowAddModal(true); }}>
                          +其他
                        </button>
                      </td>
                    </tr>
                    {isExpanded && day.printers.map(p => (
                      <tr key={`${day.date}-${p.printerId}`} style={{ background: '#f9fafb' }}>
                        <td></td>
                        <td style={{ paddingLeft: '24px', color: '#6b7280', fontSize: '13px' }}>
                          └ {p.printerName}
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          <span style={{ color: '#6b7280' }}>{p.count}张</span>
                          {p.wasteCount > 0 && (
                            <span style={{ marginLeft: '4px', color: '#ef4444', fontSize: '12px' }}>
                              (-{p.wasteCount}损耗)
                            </span>
                          )}
                          <span style={{ marginLeft: '8px', color: '#22c55e' }}>¥{p.revenue.toFixed(2)}</span>
                        </td>
                        <td style={{ fontSize: '13px', color: '#ef4444' }}>¥{p.cost.toFixed(2)}</td>
                        <td></td>
                        <td style={{ fontSize: '13px', color: p.profit >= 0 ? '#22c55e' : '#ef4444' }}>
                          ¥{p.profit.toFixed(2)}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {p.count > 0 && (
                            <button 
                              className="btn btn-sm" 
                              style={{ 
                                background: p.wasteCount > 0 ? '#fef3c7' : '#f3f4f6',
                                color: p.wasteCount > 0 ? '#d97706' : '#6b7280',
                                border: 'none', fontSize: '12px', padding: '4px 8px'
                              }}
                              onClick={() => openWasteModal(day.date, p.printerId, p.printerName, p.count, p.wasteCount)}
                            >
                              🗑️ {p.wasteCount > 0 ? `损耗:${p.wasteCount}` : '损耗'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 添加其他收入弹窗 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">添加其他收入 - {selectedDate}</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">金额 (元)</label>
                <input type="number" step="0.01" className="form-input" value={otherAmount}
                  onChange={(e) => setOtherAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">备注</label>
                <input type="text" className="form-input" placeholder="输入备注说明" value={otherNote}
                  onChange={(e) => setOtherNote(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleAddOther}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 损耗上报弹窗 */}
      {showWasteModal && (
        <div className="modal-overlay" onClick={() => setShowWasteModal(false)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🗑️ 损耗管理 - {wastePrinterName}</h2>
              <button className="modal-close" onClick={() => setShowWasteModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>日期: {wasteDate}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>物理印量: {wasteMaxCount} 张</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>总损耗: {currentTotalWaste} 张</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>有效印量: {wasteMaxCount - currentTotalWaste} 张</div>
                </div>
              </div>
              
              {/* 添加新损耗记录 */}
              <div style={{ marginBottom: '16px', padding: '16px', background: '#fefce8', borderRadius: '8px', border: '1px solid #fef08a' }}>
                <div style={{ fontWeight: 600, marginBottom: '12px', color: '#854d0e' }}>➕ 添加损耗记录</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">损耗数量 (张) *</label>
                    <input type="number" min="1" className="form-input" value={newWasteCount || ''}
                      onChange={(e) => setNewWasteCount(parseInt(e.target.value) || 0)} placeholder="输入数量" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">操作人 *</label>
                    <input type="text" className="form-input" value={newWasteOperator}
                      onChange={(e) => setNewWasteOperator(e.target.value)} placeholder="输入操作人" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '12px', marginBottom: '12px' }}>
                  <label className="form-label">备注</label>
                  <input type="text" className="form-input" value={newWasteNote}
                    onChange={(e) => setNewWasteNote(e.target.value)} placeholder="如：卡纸、错打等" />
                </div>
                <button className="btn btn-primary" onClick={handleAddWaste} style={{ width: '100%' }}>添加损耗记录</button>
              </div>
              
              {/* 已有损耗记录列表 */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: '#374151' }}>📋 损耗记录 ({wasteRecords.length})</div>
                {wasteLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>加载中...</div>
                ) : wasteRecords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', background: '#f9fafb', borderRadius: '8px' }}>暂无损耗记录</div>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {wasteRecords.map(record => (
                      <div key={record.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color: '#ef4444' }}>{record.waste_count} 张</span>
                            <span style={{ fontSize: '12px', color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{record.operator}</span>
                          </div>
                          {record.note && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{record.note}</div>}
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{record.created_at}</div>
                        </div>
                        <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }}
                          onClick={() => handleDeleteWaste(record.id)}>删除</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowWasteModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 房租设置弹窗 */}
      {showRentModal && (
        <div className="modal-overlay" onClick={() => setShowRentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⚙️ 设置月租金</h2>
              <button className="modal-close" onClick={() => setShowRentModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">月租金 (元)</label>
                <input 
                  type="number" 
                  min="0" 
                  step="1"
                  className="form-input" 
                  value={editingRent}
                  onChange={(e) => setEditingRent(parseFloat(e.target.value) || 0)} 
                />
                <p className="form-hint">每月固定房租成本，用于计算盈亏平衡</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRentModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveRent}>保存</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tooltip-trigger .tooltip-content { display: none; }
        .tooltip-trigger:hover .tooltip-content { display: block; }
      `}</style>
    </div>
  );
}

export default RevenueManager;
