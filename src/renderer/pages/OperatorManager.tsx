/**
 * OperatorManager 页面 - 操作人与损耗理由管理
 */
import React, { useState, useEffect } from 'react';
import { Operator, DamageReason } from '../../shared/types';

function OperatorManager() {
  // 操作人状态
  const [operators, setOperators] = useState<Operator[]>([]);
  const [operatorLoading, setOperatorLoading] = useState(true);

  // 损耗理由状态
  const [damageReasons, setDamageReasons] = useState<DamageReason[]>([]);
  const [reasonLoading, setReasonLoading] = useState(true);

  // 操作人弹窗
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [operatorSaving, setOperatorSaving] = useState(false);

  // 损耗理由弹窗
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [editingReason, setEditingReason] = useState<DamageReason | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [reasonSaving, setReasonSaving] = useState(false);

  // 删除确认弹窗
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'operator' | 'reason'; id: number; name: string } | null>(null);

  // 美化提示弹窗
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'warning' | 'success'; text: string } | null>(null);
  const showToast = (type: 'error' | 'warning' | 'success', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 加载操作人
  const loadOperators = async () => {
    setOperatorLoading(true);
    try {
      const result = await window.electronAPI.getOperators();
      if (result.success && result.data) {
        setOperators(result.data);
      }
    } catch (err) {
      console.error('加载操作人失败:', err);
    } finally {
      setOperatorLoading(false);
    }
  };

  // 加载损耗理由
  const loadDamageReasons = async () => {
    setReasonLoading(true);
    try {
      const result = await window.electronAPI.getDamageReasons();
      if (result.success && result.data) {
        setDamageReasons(result.data);
      }
    } catch (err) {
      console.error('加载损耗理由失败:', err);
    } finally {
      setReasonLoading(false);
    }
  };

  useEffect(() => {
    loadOperators();
    loadDamageReasons();
  }, []);

  // 打开添加操作人弹窗
  const handleAddOperator = () => {
    setEditingOperator(null);
    setOperatorName('');
    setShowOperatorModal(true);
  };

  // 打开编辑操作人弹窗
  const handleEditOperator = (op: Operator) => {
    setEditingOperator(op);
    setOperatorName(op.name);
    setShowOperatorModal(true);
  };

  // 保存操作人
  const handleSaveOperator = async () => {
    if (!operatorName.trim()) {
      showToast('warning', '请输入操作人姓名');
      return;
    }
    setOperatorSaving(true);
    try {
      if (editingOperator) {
        const result = await window.electronAPI.updateOperator(editingOperator.id, operatorName.trim());
        if (result.success) {
          loadOperators();
          setShowOperatorModal(false);
        } else {
          showToast('error', '更新失败: ' + result.error);
        }
      } else {
        const result = await window.electronAPI.addOperator(operatorName.trim());
        if (result.success) {
          loadOperators();
          setShowOperatorModal(false);
        } else {
          showToast('error', '添加失败: ' + result.error);
        }
      }
    } catch (err: any) {
      showToast('error', '操作失败: ' + err.message);
    } finally {
      setOperatorSaving(false);
    }
  };

  // 打开添加损耗理由弹窗
  const handleAddReason = () => {
    setEditingReason(null);
    setReasonText('');
    setShowReasonModal(true);
  };

  // 打开编辑损耗理由弹窗
  const handleEditReason = (reason: DamageReason) => {
    setEditingReason(reason);
    setReasonText(reason.reason);
    setShowReasonModal(true);
  };

  // 保存损耗理由
  const handleSaveReason = async () => {
    if (!reasonText.trim()) {
      showToast('warning', '请输入损耗理由');
      return;
    }
    setReasonSaving(true);
    try {
      if (editingReason) {
        const result = await window.electronAPI.updateDamageReason(editingReason.id, reasonText.trim());
        if (result.success) {
          loadDamageReasons();
          setShowReasonModal(false);
        } else {
          showToast('error', '更新失败: ' + result.error);
        }
      } else {
        const result = await window.electronAPI.addDamageReason(reasonText.trim());
        if (result.success) {
          loadDamageReasons();
          setShowReasonModal(false);
        } else {
          showToast('error', '添加失败: ' + result.error);
        }
      }
    } catch (err: any) {
      showToast('error', '操作失败: ' + err.message);
    } finally {
      setReasonSaving(false);
    }
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'operator') {
        const result = await window.electronAPI.deleteOperator(deleteConfirm.id);
        if (result.success) {
          loadOperators();
        } else {
          showToast('error', '删除失败: ' + result.error);
        }
      } else {
        const result = await window.electronAPI.deleteDamageReason(deleteConfirm.id);
        if (result.success) {
          loadDamageReasons();
        } else {
          showToast('error', '删除失败: ' + result.error);
        }
      }
    } catch (err: any) {
      showToast('error', '删除失败: ' + err.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: 'white', borderRadius: '12px', padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '24px',
  };

  const listItemStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px',
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">基础数据管理</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* 操作人管理 */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>👤 操作人管理</h2>
            <button className="btn btn-primary" onClick={handleAddOperator}>+ 添加</button>
          </div>

          <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
            {operatorLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>加载中...</div>
            ) : operators.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>暂无操作人，点击上方按钮添加</div>
            ) : (
              operators.map(op => (
                <div key={op.id} style={listItemStyle}>
                  <span style={{ fontWeight: 500 }}>{op.name}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEditOperator(op)}>编辑</button>
                    <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }}
                      onClick={() => setDeleteConfirm({ type: 'operator', id: op.id, name: op.name })}>删除</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280', textAlign: 'right' }}>
            共 {operators.length} 人
          </div>
        </div>

        {/* 损耗理由管理 */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>📋 损耗理由管理</h2>
            <button className="btn btn-primary" onClick={handleAddReason}>+ 添加</button>
          </div>

          <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
            {reasonLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>加载中...</div>
            ) : damageReasons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>暂无损耗理由，点击上方按钮添加</div>
            ) : (
              damageReasons.map(reason => (
                <div key={reason.id} style={listItemStyle}>
                  <span style={{ fontWeight: 500 }}>{reason.reason}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEditReason(reason)}>编辑</button>
                    <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }}
                      onClick={() => setDeleteConfirm({ type: 'reason', id: reason.id, name: reason.reason })}>删除</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280', textAlign: 'right' }}>
            共 {damageReasons.length} 条
          </div>
        </div>
      </div>

      {/* 操作人弹窗 */}
      {showOperatorModal && (
        <div className="modal-overlay" onClick={() => setShowOperatorModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingOperator ? '编辑操作人' : '添加操作人'}</h2>
              <button className="modal-close" onClick={() => setShowOperatorModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">操作人姓名 *</label>
                <input type="text" className="form-input" placeholder="请输入姓名" value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveOperator()} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowOperatorModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveOperator} disabled={operatorSaving}>
                {operatorSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 损耗理由弹窗 */}
      {showReasonModal && (
        <div className="modal-overlay" onClick={() => setShowReasonModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingReason ? '编辑损耗理由' : '添加损耗理由'}</h2>
              <button className="modal-close" onClick={() => setShowReasonModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">损耗理由 *</label>
                <input type="text" className="form-input" placeholder="如：卡纸、错打、测试等" value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveReason()} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReasonModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveReason} disabled={reasonSaving}>
                {reasonSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px' }}>
            <div className="modal-header">
              <h2 className="modal-title">确认删除</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ textAlign: 'center', margin: '16px 0' }}>
                确定要删除{deleteConfirm.type === 'operator' ? '操作人' : '损耗理由'} <strong>"{deleteConfirm.name}"</strong> 吗？
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>取消</button>
              <button className="btn" style={{ background: '#dc2626', color: 'white' }} onClick={confirmDelete}>删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 美化提示弹窗 Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          padding: '12px 24px', borderRadius: '8px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideDown 0.3s ease',
          background: toastMessage.type === 'error' ? '#fef2f2' : toastMessage.type === 'warning' ? '#fffbeb' : '#f0fdf4',
          border: `1px solid ${toastMessage.type === 'error' ? '#fecaca' : toastMessage.type === 'warning' ? '#fde68a' : '#bbf7d0'}`,
          color: toastMessage.type === 'error' ? '#dc2626' : toastMessage.type === 'warning' ? '#d97706' : '#16a34a',
        }}>
          <span style={{ fontSize: '18px' }}>
            {toastMessage.type === 'error' ? '❌' : toastMessage.type === 'warning' ? '⚠️' : '✅'}
          </span>
          <span style={{ fontWeight: 500 }}>{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)}
            style={{ 
              marginLeft: '8px', background: 'transparent', border: 'none', 
              cursor: 'pointer', fontSize: '16px', color: 'inherit', opacity: 0.7 
            }}
          >×</button>
        </div>
      )}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default OperatorManager;
