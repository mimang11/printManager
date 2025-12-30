/**
 * OperatorManager 页面 - 操作人与损耗理由管理
 */
import React, { useState, useEffect } from 'react';
import { Operator, DamageReason } from '../../shared/types';

function OperatorManager() {
  // 操作人状态
  const [operators, setOperators] = useState<Operator[]>([]);
  const [newOperatorName, setNewOperatorName] = useState('');
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [operatorLoading, setOperatorLoading] = useState(true);

  // 损耗理由状态
  const [damageReasons, setDamageReasons] = useState<DamageReason[]>([]);
  const [newReasonText, setNewReasonText] = useState('');
  const [editingReason, setEditingReason] = useState<DamageReason | null>(null);
  const [reasonLoading, setReasonLoading] = useState(true);

  // 删除确认
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'operator' | 'reason'; id: number } | null>(null);

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

  // 添加操作人
  const handleAddOperator = async () => {
    if (!newOperatorName.trim()) {
      alert('请输入操作人姓名');
      return;
    }
    try {
      const result = await window.electronAPI.addOperator(newOperatorName.trim());
      if (result.success && result.data) {
        setOperators([...operators, result.data]);
        setNewOperatorName('');
      } else {
        alert('添加失败: ' + result.error);
      }
    } catch (err: any) {
      alert('添加失败: ' + err.message);
    }
  };

  // 更新操作人
  const handleUpdateOperator = async () => {
    if (!editingOperator || !editingOperator.name.trim()) return;
    try {
      const result = await window.electronAPI.updateOperator(editingOperator.id, editingOperator.name.trim());
      if (result.success && result.data) {
        setOperators(operators.map(o => o.id === editingOperator.id ? result.data! : o));
        setEditingOperator(null);
      } else {
        alert('更新失败: ' + result.error);
      }
    } catch (err: any) {
      alert('更新失败: ' + err.message);
    }
  };

  // 删除操作人
  const handleDeleteOperator = async (id: number) => {
    try {
      const result = await window.electronAPI.deleteOperator(id);
      if (result.success) {
        setOperators(operators.filter(o => o.id !== id));
      } else {
        alert('删除失败: ' + result.error);
      }
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
    setDeleteConfirm(null);
  };

  // 添加损耗理由
  const handleAddReason = async () => {
    if (!newReasonText.trim()) {
      alert('请输入损耗理由');
      return;
    }
    try {
      const result = await window.electronAPI.addDamageReason(newReasonText.trim());
      if (result.success && result.data) {
        setDamageReasons([...damageReasons, result.data]);
        setNewReasonText('');
      } else {
        alert('添加失败: ' + result.error);
      }
    } catch (err: any) {
      alert('添加失败: ' + err.message);
    }
  };

  // 更新损耗理由
  const handleUpdateReason = async () => {
    if (!editingReason || !editingReason.reason.trim()) return;
    try {
      const result = await window.electronAPI.updateDamageReason(editingReason.id, editingReason.reason.trim());
      if (result.success && result.data) {
        setDamageReasons(damageReasons.map(r => r.id === editingReason.id ? result.data! : r));
        setEditingReason(null);
      } else {
        alert('更新失败: ' + result.error);
      }
    } catch (err: any) {
      alert('更新失败: ' + err.message);
    }
  };

  // 删除损耗理由
  const handleDeleteReason = async (id: number) => {
    try {
      const result = await window.electronAPI.deleteDamageReason(id);
      if (result.success) {
        setDamageReasons(damageReasons.filter(r => r.id !== id));
      } else {
        alert('删除失败: ' + result.error);
      }
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
    setDeleteConfirm(null);
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
            <span style={{ fontSize: '13px', color: '#6b7280' }}>共 {operators.length} 人</span>
          </div>

          {/* 添加操作人 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="输入操作人姓名"
              value={newOperatorName}
              onChange={(e) => setNewOperatorName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddOperator()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleAddOperator}>添加</button>
          </div>

          {/* 操作人列表 */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {operatorLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>加载中...</div>
            ) : operators.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>暂无操作人</div>
            ) : (
              operators.map(op => (
                <div key={op.id} style={listItemStyle}>
                  {editingOperator?.id === op.id ? (
                    <input
                      type="text"
                      className="form-input"
                      value={editingOperator.name}
                      onChange={(e) => setEditingOperator({ ...editingOperator, name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateOperator()}
                      style={{ flex: 1, marginRight: '8px' }}
                      autoFocus
                    />
                  ) : (
                    <span style={{ fontWeight: 500 }}>{op.name}</span>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {editingOperator?.id === op.id ? (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={handleUpdateOperator}>保存</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingOperator(null)}>取消</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingOperator(op)}>编辑</button>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }}
                          onClick={() => setDeleteConfirm({ type: 'operator', id: op.id })}
                        >删除</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 损耗理由管理 */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>📋 损耗理由管理</h2>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>共 {damageReasons.length} 条</span>
          </div>

          {/* 添加损耗理由 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="输入损耗理由（如：卡纸、错打）"
              value={newReasonText}
              onChange={(e) => setNewReasonText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddReason()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleAddReason}>添加</button>
          </div>

          {/* 损耗理由列表 */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {reasonLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>加载中...</div>
            ) : damageReasons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>暂无损耗理由</div>
            ) : (
              damageReasons.map(reason => (
                <div key={reason.id} style={listItemStyle}>
                  {editingReason?.id === reason.id ? (
                    <input
                      type="text"
                      className="form-input"
                      value={editingReason.reason}
                      onChange={(e) => setEditingReason({ ...editingReason, reason: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateReason()}
                      style={{ flex: 1, marginRight: '8px' }}
                      autoFocus
                    />
                  ) : (
                    <span style={{ fontWeight: 500 }}>{reason.reason}</span>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {editingReason?.id === reason.id ? (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={handleUpdateReason}>保存</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingReason(null)}>取消</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingReason(reason)}>编辑</button>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }}
                          onClick={() => setDeleteConfirm({ type: 'reason', id: reason.id })}
                        >删除</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
                确定要删除此{deleteConfirm.type === 'operator' ? '操作人' : '损耗理由'}吗？
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>取消</button>
              <button
                className="btn"
                style={{ background: '#dc2626', color: 'white' }}
                onClick={() => {
                  if (deleteConfirm.type === 'operator') {
                    handleDeleteOperator(deleteConfirm.id);
                  } else {
                    handleDeleteReason(deleteConfirm.id);
                  }
                }}
              >删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorManager;
