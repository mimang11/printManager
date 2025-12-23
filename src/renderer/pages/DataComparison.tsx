/**
 * ============================================
 * DataComparison 页面 - 数据对比
 * ============================================
 * 展示日/周/月对比数据
 */

import React, { useState, useEffect } from 'react';
import { PrinterConfig, ComparisonData } from '../../shared/types';

function DataComparison() {
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载打印机列表
  useEffect(() => {
    const loadPrinters = async () => {
      const data = await window.electronAPI.getPrinters();
      setPrinters(data);
      setLoading(false);
    };
    loadPrinters();
  }, []);

  // 加载对比数据
  useEffect(() => {
    const loadComparison = async () => {
      const data = await window.electronAPI.getComparisonData(selectedPrinter || undefined);
      setComparison(data);
    };
    loadComparison();
  }, [selectedPrinter]);

  // 渲染变化指示器
  const renderChange = (change: number, percent: number) => {
    const isPositive = change >= 0;
    return (
      <span className={isPositive ? 'positive' : 'negative'} style={{ color: isPositive ? '#22c55e' : '#ef4444' }}>
        {isPositive ? '↑' : '↓'} {Math.abs(change)} ({Math.abs(percent)}%)
      </span>
    );
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">数据对比</h1>
        <select
          className="form-input"
          style={{ width: '200px' }}
          value={selectedPrinter}
          onChange={(e) => setSelectedPrinter(e.target.value)}
        >
          <option value="">全部设备</option>
          {printers.map((p) => (
            <option key={p.id} value={p.id}>{p.alias}</option>
          ))}
        </select>
      </div>

      {comparison && (
        <div className="kpi-grid">
          {/* 日对比 */}
          <div className="card">
            <div className="card-title">📅 昨日 vs 今日</div>
            <table className="table">
              <tbody>
                <tr>
                  <td>昨日印量</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{comparison.day_over_day.yesterday}</td>
                </tr>
                <tr>
                  <td>今日印量</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{comparison.day_over_day.today}</td>
                </tr>
                <tr>
                  <td>变化</td>
                  <td style={{ textAlign: 'right' }}>
                    {renderChange(comparison.day_over_day.change, comparison.day_over_day.change_percent)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 周对比 */}
          <div className="card">
            <div className="card-title">📆 上周 vs 本周</div>
            <table className="table">
              <tbody>
                <tr>
                  <td>上周印量</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{comparison.week_over_week.last_week}</td>
                </tr>
                <tr>
                  <td>本周印量</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{comparison.week_over_week.this_week}</td>
                </tr>
                <tr>
                  <td>变化</td>
                  <td style={{ textAlign: 'right' }}>
                    {renderChange(comparison.week_over_week.change, comparison.week_over_week.change_percent)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 月对比 */}
          <div className="card">
            <div className="card-title">🗓️ 上月 vs 本月</div>
            <table className="table">
              <tbody>
                <tr>
                  <td>上月印量</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{comparison.month_over_month.last_month}</td>
                </tr>
                <tr>
                  <td>本月印量</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{comparison.month_over_month.this_month}</td>
                </tr>
                <tr>
                  <td>变化</td>
                  <td style={{ textAlign: 'right' }}>
                    {renderChange(comparison.month_over_month.change, comparison.month_over_month.change_percent)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataComparison;
