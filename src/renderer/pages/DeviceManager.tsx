/**
 * ============================================
 * DeviceManager 页面 - 设备管理 (云端版)
 * ============================================
 * 从 Turso 云端数据库读取和管理打印机设备
 * 通过 IP 地址关联 printer_logs 表
 */

import React, { useState, useEffect } from 'react';
import { CloudPrinterConfig, PrinterStatsData } from '../../shared/types';

// 空表单数据
const emptyForm = {
  machine_name: '',
  machine_ip: '',
  printer_type: 'mono' as 'mono' | 'color',
  cost_per_page: 0.05,
  price_per_page: 0.5,
  scrape_url: '',
};

function DeviceManager() {
  // 打印机统计数据列表
  const [printerStats, setPrinterStats] = useState<PrinterStatsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 是否显示成本信息
  const [showCost, setShowCost] = useState(false);
  
  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<CloudPrinterConfig | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState(emptyForm);
  
  // IP 检查状态
  const [ipCheckResult, setIpCheckResult] = useState<{ exists: boolean; machine_name?: string } | null>(null);
  const [checkingIP, setCheckingIP] = useState(false);
  
  // 保存状态
  const [saving, setSaving] = useState(false);

  // 加载打印机统计数据
  const loadPrinterStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.getAllPrinterStats();
      if (result.success && result.data) {
        setPrinterStats(result.data);
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
    loadPrinterStats();
  }, []);

  // 检查 IP 是否存在于 printer_logs
  const checkIP = async (ip: string) => {
    if (!ip.trim()) {
      setIpCheckResult(null);
      return;
    }
    setCheckingIP(true);
    try {
      const result = await window.electronAPI.checkIPExists(ip);
      if (result.success && result.data) {
        setIpCheckResult(result.data);
      }
    } catch (err) {
      setIpCheckResult(null);
    } finally {
      setCheckingIP(false);
    }
  };

  // 打开添加弹窗
  const handleAdd = () => {
    setEditingPrinter(null);
    setFormData(emptyForm);
    setIpCheckResult(null);
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (printer: CloudPrinterConfig) => {
    setEditingPrinter(printer);
    setFormData({
      machine_name: printer.machine_name,
      machine_ip: printer.machine_ip,
      printer_type: printer.printer_type,
      cost_per_page: printer.cost_per_page,
      price_per_page: printer.price_per_page,
      scrape_url: printer.scrape_url || '',
    });
    setIpCheckResult(null);
    setShowModal(true);
  };

  // 删除打印机
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确定要删除打印机 "${name}" 吗？`)) return;
    try {
      const result = await window.electronAPI.deleteCloudPrinter(id);
      if (result.success) {
        loadPrinterStats();
      } else {
        alert('删除失败: ' + result.error);
      }
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
  };

  // 保存打印机
  const handleSave = async () => {
    if (!formData.machine_name.trim()) {
      alert('请输入打印机名称');
      return;
    }
    if (!formData.machine_ip.trim()) {
      alert('请输入 IP 地址');
      return;
    }
    
    setSaving(true);
    try {
      if (editingPrinter) {
        // 更新
        const result = await window.electronAPI.updateCloudPrinter(editingPrinter.id, {
          machine_name: formData.machine_name,
          machine_ip: formData.machine_ip,
          printer_type: formData.printer_type,
          cost_per_page: formData.cost_per_page,
          price_per_page: formData.price_per_page,
          scrape_url: formData.scrape_url || null,
        });
        if (!result.success) {
          alert('更新失败: ' + result.error);
          return;
        }
      } else {
        // 添加 - 状态由后端根据 IP 是否存在于 printer_logs 决定
        const result = await window.electronAPI.addCloudPrinter({
          machine_name: formData.machine_name,
          machine_ip: formData.machine_ip,
          printer_type: formData.printer_type,
          cost_per_page: formData.cost_per_page,
          price_per_page: formData.price_per_page,
          scrape_url: formData.scrape_url || null,
          status: 'offline', // 后端会根据 IP 检查结果覆盖
        });
        if (!result.success) {
          alert('添加失败: ' + result.error);
          return;
        }
      }
      setShowModal(false);
      loadPrinterStats();
    } catch (err: any) {
      alert('保存失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 渲染状态标签
  const renderStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      online: 'status-online',
      offline: 'status-offline',
      error: 'status-error',
    };
    const labelMap: Record<string, string> = {
      online: '在线',
      offline: '离线',
      error: '错误',
    };
    return <span className={`status-badge ${statusMap[status] || 'status-offline'}`}>{labelMap[status] || '未知'}</span>;
  };

  // 一键添加表中的打印机
  const [autoAdding, setAutoAdding] = useState(false);
  const handleAutoAddPrinters = async () => {
    setAutoAdding(true);
    try {
      const result = await window.electronAPI.autoAddPrintersFromLogs();
      if (result.success) {
        alert('✅ ' + result.message);
        loadPrinterStats(); // 刷新列表
      } else {
        alert('❌ 添加失败: ' + result.error);
      }
    } catch (err: any) {
      alert('❌ 添加失败: ' + err.message);
    } finally {
      setAutoAdding(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">设备管理 <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'normal' }}>(云端)</span></h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary"
            onClick={handleAutoAddPrinters}
            disabled={autoAdding}
          >
            {autoAdding ? '⏳ 添加中...' : '📥 一键添加表中的打印机'}
          </button>
          <button 
            className={`btn ${showCost ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setShowCost(!showCost)}
          >
            {showCost ? '🔓 隐藏成本' : '🔒 显示成本'}
          </button>
          <button className="btn btn-primary" onClick={handleAdd}>+ 添加打印机</button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {error}
          <button onClick={loadPrinterStats} style={{ marginLeft: '12px' }}>重试</button>
        </div>
      )}

      {printerStats.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>暂无打印机，点击上方按钮添加</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>名称</th>
                <th>IP 地址</th>
                <th>类型</th>
                <th>状态</th>
                <th>总打印量</th>
                {showCost && <th>成本/售价</th>}
                {showCost && <th>总利润</th>}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {printerStats.map((stat) => (
                <tr key={stat.printer.id}>
                  <td style={{ color: '#3b82f6', fontWeight: 500 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      {stat.printer.printer_type === 'color' ? (
                        <span style={{ fontSize: '18px', position: 'relative' }}>
                          🖨️<span style={{ position: 'absolute', bottom: '-2px', right: '-4px', width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #f59e0b, #22c55e, #3b82f6)', border: '1px solid white' }}></span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '18px', filter: 'grayscale(100%)' }}>🖨️</span>
                      )}
                      {stat.printer.machine_name}
                    </span>
                  </td>
                  <td>{stat.printer.machine_ip}</td>
                  <td>{stat.printer.printer_type === 'color' ? '彩色机' : '黑白机'}</td>
                  <td>{renderStatus(stat.printer.status)}</td>
                  <td>{stat.total_prints.toLocaleString()} 张</td>
                  {showCost && <td>¥{stat.printer.cost_per_page} / ¥{stat.printer.price_per_page}</td>}
                  {showCost && <td style={{ color: stat.total_profit >= 0 ? '#22c55e' : '#ef4444' }}>¥{stat.total_profit.toFixed(2)}</td>}
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(stat.printer)} style={{ marginRight: '8px' }}>
                      编辑
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(stat.printer.id, stat.printer.machine_name)}>
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingPrinter ? '编辑打印机' : '添加打印机'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">打印机名称 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：一号机"
                  value={formData.machine_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, machine_name: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label className="form-label">IP 地址 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：192.168.1.18"
                  value={formData.machine_ip}
                  onChange={(e) => setFormData(prev => ({ ...prev, machine_ip: e.target.value }))}
                  onBlur={(e) => checkIP(e.target.value)}
                  autoComplete="off"
                />
                {checkingIP && <p className="form-hint">检查中...</p>}
                {ipCheckResult && (
                  <p className="form-hint" style={{ color: ipCheckResult.exists ? '#22c55e' : '#f59e0b' }}>
                    {ipCheckResult.exists 
                      ? `✅ 已关联日志数据 (${ipCheckResult.machine_name})，状态将设为"在线"` 
                      : '⚠️ 未找到日志数据，状态将设为"离线"'}
                  </p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">打印机类型</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="printer_type" 
                      checked={formData.printer_type === 'mono'}
                      onChange={() => setFormData({ ...formData, printer_type: 'mono' })}
                    />
                    <span style={{ filter: 'grayscale(100%)' }}>🖨️</span> 黑白机
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="printer_type" 
                      checked={formData.printer_type === 'color'}
                      onChange={() => setFormData({ ...formData, printer_type: 'color' })}
                    />
                    <span style={{ position: 'relative' }}>
                      🖨️<span style={{ position: 'absolute', bottom: '-2px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #f59e0b, #22c55e, #3b82f6)' }}></span>
                    </span> 彩色机
                  </label>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">单张成本 (元)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.cost_per_page}
                    onChange={(e) => setFormData({ ...formData, cost_per_page: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">单张售价 (元)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.price_per_page}
                    onChange={(e) => setFormData({ ...formData, price_per_page: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">数据抓取URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={formData.printer_type === 'color' 
                    ? `默认: http://${formData.machine_ip || 'IP'}/prcnt.htm`
                    : `默认: http://${formData.machine_ip || 'IP'}/web/guest/cn/websys/status/getUnificationCounter.cgi`}
                  value={formData.scrape_url}
                  onChange={(e) => setFormData({ ...formData, scrape_url: e.target.value })}
                  autoComplete="off"
                />
                <p className="form-hint">用于同步打印计数的网页地址，留空则使用默认URL</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceManager;
