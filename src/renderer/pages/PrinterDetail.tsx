/**
 * ============================================
 * PrinterDetail 页面 - 打印机详情
 * ============================================
 * 显示打印机的详细状态信息
 */

import React, { useState, useEffect } from 'react';
import { PrinterConfig, PrinterDetail as PrinterDetailType } from '../../shared/types';

interface Props {
  printer: PrinterConfig;
  onBack: () => void;
}

function PrinterDetailPage({ printer, onBack }: Props) {
  const [detail, setDetail] = useState<PrinterDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从打印机 URL 提取基础地址
  const getBaseUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      // 尝试从 URL 中提取 IP
      const match = url.match(/https?:\/\/[^\/]+/);
      return match ? match[0] : url;
    }
  };

  // 加载详情数据
  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getBaseUrl(printer.target_url);
      const result = await window.electronAPI.getPrinterDetail(baseUrl);
      if (result.success && result.data) {
        setDetail(result.data);
      } else {
        setError(result.error || '获取详情失败');
      }
    } catch (err: any) {
      setError(err.message || '获取详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [printer.id]);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            ← 返回
          </button>
          <h1 className="page-title">{printer.alias} - 详情</h1>
        </div>
        <button className="btn btn-primary" onClick={loadDetail} disabled={loading}>
          {loading ? '加载中...' : '🔄 刷新'}
        </button>
      </div>

      {/* 基本信息卡片 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title">基本信息</div>
        <table className="table">
          <tbody>
            <tr>
              <td style={{ width: '150px', fontWeight: 500 }}>设备ID</td>
              <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{printer.id}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>别名</td>
              <td>{printer.alias}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>抓取地址</td>
              <td>{printer.target_url}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>状态</td>
              <td>
                <span className={`status-badge status-${printer.status}`}>
                  {printer.status === 'online' ? '在线' : printer.status === 'offline' ? '离线' : '错误'}
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>单张成本</td>
              <td>¥{printer.financials.cost_per_page}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>单张售价</td>
              <td>¥{printer.financials.price_per_page}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>最后更新</td>
              <td>{new Date(printer.last_updated).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 设备状态详情 */}
      <div className="card">
        <div className="card-title">设备状态详情</div>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="alert alert-error" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {error}
          </div>
        ) : detail ? (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '200px' }}>字段</th>
                <th>值</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(detail).map(([key, value]) => (
                <tr key={key}>
                  <td style={{ fontWeight: 500 }}>{key}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">暂无数据</div>
        )}
      </div>
    </div>
  );
}

export default PrinterDetailPage;
