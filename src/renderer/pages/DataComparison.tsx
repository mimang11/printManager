/**
 * DataComparison 页面 - 数据对比 (云端版)
 * 从 Turso 云端数据库获取对比数据
 */

import React, { useState, useEffect } from 'react';
import { CloudPrinterConfig, CloudComparisonData } from '../../shared/types';

function DataComparison() {
  const [printers, setPrinters] = useState<CloudPrinterConfig[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [comparison, setComparison] = useState<CloudComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 加载打印机列表
  const loadPrinters = async () => {
    try {
      const result = await window.electronAPI.getCloudPrinterConfigs();
      if (result.success && result.data) {
        setPrinters(result.data);
      }
    } catch (err) {
      console.error('加载打印机列表失败:', err);
    }
  };

  // 加载对比数据
  const loadComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const machineIP = selectedPrinter || undefined;
      const result = await window.electronAPI.getCloudComparison(machineIP);
      if (result.success && result.data) {
        setComparison(result.data);
        setLastUpdate(new Date());
      } else {
        setError(result.error || '加载失败');
      }
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  useEffect(() => {
    loadComparison();
  }, [selectedPrinter]);

  // 渲染变化指示器
  const renderChange = (change: number, percent: number) => {
    const isPositive = change >= 0;
    return (
      <span style={{ 
        color: isPositive ? '#22c55e' : '#ef4444',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span style={{ fontSize: '16px' }}>{isPositive ? '↑' : '↓'}</span>
        {Math.abs(change).toLocaleString()} ({Math.abs(percent)}%)
      </span>
    );
  };

  const formatTimestamp = (date: Date) => date.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className="page-title">数据对比 <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'normal' }}>(云端)</span></h1>
          {lastUpdate && (
            <span style={{ fontSize: '13px', color: '#6b7280', background: '#f3f4f6',
              padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#22c55e', fontSize: '8px' }}>●</span>
              数据更新于 {formatTimestamp(lastUpdate)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            className="form-input"
            style={{ width: '200px', minWidth: '200px' }}
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
          >
            <option value="">全部设备</option>
            {printers.map((p) => (
              <option key={p.id} value={p.machine_ip}>{p.machine_name}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={loadComparison} disabled={loading}>
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
          <button className="btn btn-primary" onClick={loadComparison} style={{ background: '#dc2626' }}>
            重试
          </button>
        </div>
      )}

      {loading && !comparison ? (
        <div className="loading">加载中...</div>
      ) : comparison && (
        <div className="kpi-grid">
          {/* 日对比 */}
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>📅</span>
              昨日 vs 今日
            </div>
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>昨日印量</span>
                <span style={{ fontWeight: 700, fontSize: '18px' }}>{comparison.day_over_day.yesterday.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>今日印量</span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#3b82f6' }}>{comparison.day_over_day.today.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <span style={{ color: '#6b7280' }}>环比变化</span>
                {renderChange(comparison.day_over_day.change, comparison.day_over_day.change_percent)}
              </div>
            </div>
          </div>

          {/* 周对比 */}
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>📆</span>
              上周 vs 本周
            </div>
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>上周印量</span>
                <span style={{ fontWeight: 700, fontSize: '18px' }}>{comparison.week_over_week.last_week.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>本周印量</span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#3b82f6' }}>{comparison.week_over_week.this_week.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <span style={{ color: '#6b7280' }}>环比变化</span>
                {renderChange(comparison.week_over_week.change, comparison.week_over_week.change_percent)}
              </div>
            </div>
          </div>

          {/* 月对比 */}
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🗓️</span>
              上月 vs 本月
            </div>
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>上月印量</span>
                <span style={{ fontWeight: 700, fontSize: '18px' }}>{comparison.month_over_month.last_month.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>本月印量</span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#3b82f6' }}>{comparison.month_over_month.this_month.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <span style={{ color: '#6b7280' }}>环比变化</span>
                {renderChange(comparison.month_over_month.change, comparison.month_over_month.change_percent)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataComparison;
