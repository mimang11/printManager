/**
 * RevenueManager 页面 - 营收管理
 * 优化版：可折叠机器明细、悬浮提示
 */
import React, { useState, useEffect } from 'react';
import { MonthlyRevenueData } from '../../shared/types';

function RevenueManager() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [revenueData, setRevenueData] = useState<MonthlyRevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // 其他收入弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [otherAmount, setOtherAmount] = useState(0);
  const [otherNote, setOtherNote] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getMonthlyRevenueData(year, month);
      setRevenueData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [year, month]);

  const handleAddOther = async () => {
    if (!selectedDate) return;
    try {
      await window.electronAPI.addOtherRevenue({
        date: selectedDate, amount: otherAmount,
        description: otherNote, category: '其他',
      });
      setShowAddModal(false);
      setOtherAmount(0);
      setOtherNote('');
      loadData();
    } catch (error) {
      alert('添加失败: ' + error);
    }
  };

  const toggleRow = (date: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(date)) {
      newSet.delete(date);
    } else {
      newSet.add(date);
    }
    setExpandedRows(newSet);
  };

  const expandAll = () => {
    const allDates = revenueData.filter(d => d.printers.some(p => p.count > 0) || d.otherIncome !== 0).map(d => d.date);
    setExpandedRows(new Set(allDates));
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  // 计算月度汇总
  const monthTotals = revenueData.reduce((acc, day) => {
    const printerRevenue = day.printers.reduce((sum, p) => sum + p.revenue, 0);
    const printerCost = day.printers.reduce((sum, p) => sum + p.cost, 0);
    return {
      totalRevenue: acc.totalRevenue + printerRevenue,
      totalCost: acc.totalCost + printerCost,
      otherIncome: acc.otherIncome + day.otherIncome,
      netProfit: acc.netProfit + day.netProfit,
      totalRent: acc.totalRent + Math.abs(day.rent),
    };
  }, { totalRevenue: 0, totalCost: 0, otherIncome: 0, netProfit: 0, totalRent: 0 });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  // 悬浮提示样式
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
    background: '#1f2937', color: 'white', padding: '8px 12px', borderRadius: '8px',
    fontSize: '12px', whiteSpace: 'nowrap', zIndex: 100, marginTop: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  };

  const filteredData = revenueData.filter(d => d.printers.some(p => p.count > 0) || d.otherIncome !== 0);

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="page-title">营收管理</h1>
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
          <select className="form-input" style={{ width: '90px', minWidth: '90px' }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {months.map(m => <option key={m} value={m}>{m}月</option>)}
          </select>
          <button className="btn btn-primary" onClick={loadData} disabled={loading}>
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 月度汇总卡片 */}
      <div className="kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-label">本月总营业额</div>
          <div className="kpi-value">¥{(monthTotals.totalRevenue + monthTotals.otherIncome).toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">本月总成本</div>
          <div className="kpi-value" style={{ color: '#ef4444' }}>¥{(monthTotals.totalCost + monthTotals.totalRent).toFixed(2)}</div>
          <div className="kpi-change" style={{ color: '#6b7280' }}>耗材 ¥{monthTotals.totalCost.toFixed(0)} + 房租 ¥{monthTotals.totalRent.toFixed(0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">本月其他收入</div>
          <div className="kpi-value" style={{ color: '#22c55e' }}>¥{monthTotals.otherIncome.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">本月纯利润</div>
          <div className="kpi-value" style={{ color: monthTotals.netProfit >= 0 ? '#22c55e' : '#ef4444' }}>
            ¥{monthTotals.netProfit.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 每日明细表格 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>每日营收明细</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm btn-secondary" onClick={expandAll}>全部展开</button>
            <button className="btn btn-sm btn-secondary" onClick={collapseAll}>全部折叠</button>
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
                const totalCost = dayCost + Math.abs(day.rent);
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
                          耗材成本: ¥{dayCost.toFixed(2)}<br/>房租: ¥{Math.abs(day.rent).toFixed(0)}
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
                        <span style={{ color: day.netProfit >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600, cursor: 'help' }}>
                          ¥{day.netProfit.toFixed(2)}
                        </span>
                        <div className="tooltip-content" style={tooltipStyle}>
                          营业额: ¥{(dayRevenue + day.otherIncome).toFixed(2)}<br/>
                          - 耗材: ¥{dayCost.toFixed(2)}<br/>
                          - 房租: ¥{Math.abs(day.rent).toFixed(0)}<br/>
                          = 纯利润: ¥{day.netProfit.toFixed(2)}
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
                          <span style={{ marginLeft: '8px', color: '#22c55e' }}>¥{p.revenue.toFixed(2)}</span>
                        </td>
                        <td style={{ fontSize: '13px', color: '#ef4444' }}>¥{p.cost.toFixed(2)}</td>
                        <td></td>
                        <td style={{ fontSize: '13px', color: p.profit >= 0 ? '#22c55e' : '#ef4444' }}>
                          ¥{p.profit.toFixed(2)}
                        </td>
                        <td></td>
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

      <style>{`
        .tooltip-trigger .tooltip-content { display: none; }
        .tooltip-trigger:hover .tooltip-content { display: block; }
      `}</style>
    </div>
  );
}

export default RevenueManager;
