/**
 * RevenueManager 页面 - 营收管理
 * 显示每台机器明细、其他收入、房租、纯利润
 */
import React, { useState, useEffect } from 'react';
import { MonthlyRevenueData, OtherRevenue } from '../../shared/types';

function RevenueManager() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [revenueData, setRevenueData] = useState<MonthlyRevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 其他收入弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [otherAmount, setOtherAmount] = useState(0);
  const [otherNote, setOtherNote] = useState('');

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getMonthlyRevenueData(year, month);
      setRevenueData(data);
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  // 添加其他收入
  const handleAddOther = async () => {
    if (!selectedDate) return;
    try {
      await window.electronAPI.addOtherRevenue({
        date: selectedDate,
        amount: otherAmount,
        description: otherNote,
        category: '其他',
      });
      setShowAddModal(false);
      setOtherAmount(0);
      setOtherNote('');
      loadData();
    } catch (error) {
      alert('添加失败: ' + error);
    }
  };

  // 打开添加弹窗
  const openAddModal = (date: string) => {
    setSelectedDate(date);
    setShowAddModal(true);
  };

  // 计算月度汇总
  const monthTotals = revenueData.reduce((acc, day) => {
    const printerRevenue = day.printers.reduce((sum, p) => sum + p.revenue, 0);
    const printerCost = day.printers.reduce((sum, p) => sum + p.cost, 0);
    const printerProfit = day.printers.reduce((sum, p) => sum + p.profit, 0);
    return {
      totalRevenue: acc.totalRevenue + printerRevenue,
      totalCost: acc.totalCost + printerCost,
      totalProfit: acc.totalProfit + printerProfit,
      otherIncome: acc.otherIncome + day.otherIncome,
      netProfit: acc.netProfit + day.netProfit,
    };
  }, { totalRevenue: 0, totalCost: 0, totalProfit: 0, otherIncome: 0, netProfit: 0 });

  // 获取打印机列表（从第一条有数据的记录）
  const printerNames = revenueData.length > 0 ? revenueData[0].printers.map(p => p.printerName) : [];

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">营收管理</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select className="form-input" style={{ width: '100px' }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select className="form-input" style={{ width: '80px' }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {months.map(m => <option key={m} value={m}>{m}月</option>)}
          </select>
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
          <div className="kpi-value" style={{ color: '#ef4444' }}>¥{monthTotals.totalCost.toFixed(2)}</div>
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
          <div className="kpi-change" style={{ color: '#6b7280' }}>已扣房租 ¥{(revenueData.length * 150).toFixed(0)}</div>
        </div>
      </div>

      {/* 每日明细表格 */}
      <div className="card">
        <div className="card-title">每日营收明细</div>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '1200px' }}>
              <thead>
                <tr>
                  <th>日期</th>
                  {printerNames.map(name => (
                    <th key={name} colSpan={3} style={{ textAlign: 'center', background: '#e0f2fe' }}>{name}</th>
                  ))}
                  <th>其他收入</th>
                  <th>总营业额</th>
                  <th>房租</th>
                  <th>纯利润</th>
                  <th>操作</th>
                </tr>
                <tr>
                  <th></th>
                  {printerNames.map(name => (
                    <React.Fragment key={name + '-sub'}>
                      <th style={{ fontSize: '12px' }}>数量</th>
                      <th style={{ fontSize: '12px' }}>成本</th>
                      <th style={{ fontSize: '12px' }}>收益</th>
                    </React.Fragment>
                  ))}
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {revenueData.filter(d => d.printers.some(p => p.count > 0) || d.otherIncome !== 0).map((day) => (
                  <tr key={day.date}>
                    <td style={{ fontWeight: 500 }}>{day.date.slice(5)}</td>
                    {day.printers.map(p => (
                      <React.Fragment key={p.printerId}>
                        <td>{p.count || '-'}</td>
                        <td style={{ color: '#ef4444' }}>{p.cost > 0 ? `¥${p.cost.toFixed(2)}` : '-'}</td>
                        <td style={{ color: '#22c55e' }}>{p.revenue > 0 ? `¥${p.revenue.toFixed(2)}` : '-'}</td>
                      </React.Fragment>
                    ))}
                    <td>
                      {day.otherIncome !== 0 ? (
                        <span title={day.otherIncomeNote} style={{ color: '#3b82f6', cursor: 'help' }}>
                          ¥{day.otherIncome.toFixed(2)}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ fontWeight: 500 }}>¥{day.totalRevenue.toFixed(2)}</td>
                    <td style={{ color: '#ef4444' }}>¥{Math.abs(day.rent).toFixed(0)}</td>
                    <td style={{ color: day.netProfit >= 0 ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                      ¥{day.netProfit.toFixed(2)}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => openAddModal(day.date)}>
                        +其他
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}

export default RevenueManager;
