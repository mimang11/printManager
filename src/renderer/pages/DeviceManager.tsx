/**
 * ============================================
 * DeviceManager 页面 - 设备管理
 * ============================================
 * 管理打印机设备：添加、编辑、删除、测试连接
 * 
 * React 概念：
 * - 条件渲染: {condition && <Component />}
 * - 列表渲染: array.map() 配合 key 属性
 * - 表单处理: onChange 事件更新状态
 */

import React, { useState, useEffect } from 'react';
import { PrinterConfig, ScrapeResult } from '../../shared/types';
import PrinterDetailPage from './PrinterDetail';

// 默认选择器
const DEFAULT_SELECTOR = 'table > tbody > tr > td:nth-child(3) > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(1) > tbody > tr > td:nth-child(4)';

// 空表单数据
const emptyForm = {
  alias: '',
  target_url: '',
  dom_selector: DEFAULT_SELECTOR,
  cost_per_page: 0.05,
  price_per_page: 0.5,
  revenue_formula: '',
  cost_formula: '',
};

function DeviceManager() {
  // 打印机列表
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 选中的打印机 (用于显示详情页)
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterConfig | null>(null);
  
  // 是否显示成本信息
  const [showCost, setShowCost] = useState(false);
  
  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState(emptyForm);
  
  // 测试结果
  const [testResult, setTestResult] = useState<ScrapeResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载打印机列表
  const loadPrinters = async () => {
    try {
      const data = await window.electronAPI.getPrinters();
      setPrinters(data);
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  // 打开添加弹窗
  const handleAdd = () => {
    setEditingPrinter(null);
    setFormData(emptyForm);
    setTestResult(null);
    setShowModal(true);
  };

  // 打开编辑弹窗
  const handleEdit = (printer: PrinterConfig) => {
    setEditingPrinter(printer);
    setFormData({
      alias: printer.alias,
      target_url: printer.target_url,
      dom_selector: printer.dom_selector,
      cost_per_page: printer.financials.cost_per_page,
      price_per_page: printer.financials.price_per_page,
      revenue_formula: printer.financials.revenue_formula || '',
      cost_formula: printer.financials.cost_formula || '',
    });
    setTestResult(null);
    setShowModal(true);
  };

  // 删除打印机
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这台打印机吗？')) return;
    await window.electronAPI.deletePrinter(id);
    loadPrinters();
  };

  // 刷新单个打印机
  const handleRefreshOne = async (id: string) => {
    await window.electronAPI.refreshOne(id);
    loadPrinters();
  };

  // 测试抓取
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.electronAPI.testScrape(formData.target_url, formData.dom_selector);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, printer_id: 'test', error: '测试失败', timestamp: Date.now() });
    } finally {
      setTesting(false);
    }
  };

  // 保存打印机
  const handleSave = async () => {
    setSaving(true);
    try {
      const printerData = {
        alias: formData.alias,
        target_url: formData.target_url,
        dom_selector: formData.dom_selector,
        financials: {
          cost_per_page: formData.cost_per_page,
          price_per_page: formData.price_per_page,
          revenue_formula: formData.revenue_formula || undefined,
          cost_formula: formData.cost_formula || undefined,
        },
      };

      if (editingPrinter) {
        await window.electronAPI.updatePrinter({
          ...editingPrinter,
          ...printerData,
        });
      } else {
        await window.electronAPI.addPrinter(printerData);
      }
      
      setShowModal(false);
      loadPrinters();
    } catch (error) {
      alert('保存失败: ' + error);
    } finally {
      setSaving(false);
    }
  };

  // 从URL提取IP地址
  const extractIP = (url: string): string => {
    const match = url.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    return match ? match[1] : url;
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
    return <span className={`status-badge ${statusMap[status]}`}>{labelMap[status]}</span>;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  // 如果选中了打印机，显示详情页
  if (selectedPrinter) {
    return (
      <PrinterDetailPage 
        printer={selectedPrinter} 
        onBack={() => setSelectedPrinter(null)} 
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">设备管理</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={`btn ${showCost ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setShowCost(!showCost)}
          >
            {showCost ? '🔓 隐藏成本' : '🔒 显示成本'}
          </button>
          <button className="btn btn-primary" onClick={handleAdd}>+ 添加打印机</button>
        </div>
      </div>

      {printers.length === 0 ? (
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
                <th>别名</th>
                <th>地址</th>
                <th>状态</th>
                {showCost && <th>成本/售价</th>}
                <th>最后更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {printers.map((printer) => (
                <tr key={printer.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedPrinter(printer)}>
                  <td style={{ color: '#3b82f6', fontWeight: 500 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🖨️</span>
                      {printer.alias}
                    </span>
                  </td>
                  <td>
                    <a 
                      href={printer.target_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ 
                        color: '#3b82f6', textDecoration: 'none', 
                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}
                      title={printer.target_url}
                    >
                      {extractIP(printer.target_url)}
                      <span style={{ fontSize: '12px' }}>↗</span>
                    </a>
                  </td>
                  <td>{renderStatus(printer.status)}</td>
                  {showCost && <td>¥{printer.financials.cost_per_page} / ¥{printer.financials.price_per_page}</td>}
                  <td>{new Date(printer.last_updated).toLocaleString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleRefreshOne(printer.id)} style={{ marginRight: '8px' }}>
                      刷新
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(printer)} style={{ marginRight: '8px' }}>
                      编辑
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(printer.id)}>
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingPrinter ? '编辑打印机' : '添加打印机'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">别名 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：财务室夏普"
                  value={formData.alias}
                  onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">抓取地址 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="http://192.168.1.100/status.html"
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">CSS 选择器</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.dom_selector}
                  onChange={(e) => setFormData({ ...formData, dom_selector: e.target.value })}
                />
                <p className="form-hint">用于定位计数器数值的 CSS 选择器</p>
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
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">收益公式 (可选)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="例如: count * 0.5"
                    value={formData.revenue_formula}
                    onChange={(e) => setFormData({ ...formData, revenue_formula: e.target.value })}
                  />
                  <p className="form-hint">留空则使用: count * 单张售价</p>
                </div>
                <div className="form-group">
                  <label className="form-label">成本公式 (可选)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="例如: count * 0.05"
                    value={formData.cost_formula}
                    onChange={(e) => setFormData({ ...formData, cost_formula: e.target.value })}
                  />
                  <p className="form-hint">留空则使用: count * 单张成本</p>
                </div>
              </div>

              {/* 测试结果 */}
              {testResult && (
                <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`}>
                  {testResult.success 
                    ? `测试成功！读取到计数器: ${testResult.counter}` 
                    : `测试失败: ${testResult.error}`}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleTest} disabled={testing || !formData.target_url}>
                {testing ? '测试中...' : '测试抓取'}
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !formData.alias || !formData.target_url}>
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
