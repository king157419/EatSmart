import { useState, useEffect } from "react";
import { apiAdminStats, apiAdminReloadKnowledge } from "../../services/api";
import type { AdminStats } from "../../types";

interface AdminPanelProps {
  password: string;
  onClose: () => void;
}

export default function AdminPanel({ password, onClose }: AdminPanelProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadingKnowledge, setReloadingKnowledge] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiAdminStats(password);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handleReloadKnowledge = async () => {
    if (!confirm("确定要重新加载知识库吗？")) return;

    setReloadingKnowledge(true);
    try {
      await apiAdminReloadKnowledge(password);
      alert("知识库重新加载成功");
    } catch (err) {
      alert("重载失败: " + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      setReloadingKnowledge(false);
    }
  };

  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-card admin-panel-card" onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ 管理控制台</h2>

        {loading ? (
          <p className="empty-hint">加载中...</p>
        ) : error ? (
          <p className="error-hint">{error}</p>
        ) : stats ? (
          <>
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="stat-label">饮食记录</div>
                <div className="stat-value">{stats.total_meals}</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-label">运动记录</div>
                <div className="stat-value">{stats.total_exercises}</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-label">对话会话</div>
                <div className="stat-value">{stats.total_sessions}</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-label">对话消息</div>
                <div className="stat-value">{stats.total_messages}</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-label">数据库大小</div>
                <div className="stat-value">{stats.db_size_mb} MB</div>
              </div>
            </div>

            <div className="admin-actions">
              <h3>管理操作</h3>
              <button
                className="admin-action-btn"
                onClick={handleReloadKnowledge}
                disabled={reloadingKnowledge}
              >
                {reloadingKnowledge ? "重载中..." : "🔄 重新加载知识库"}
              </button>
              <button
                className="admin-action-btn"
                onClick={loadStats}
              >
                🔃 刷新统计
              </button>
            </div>
          </>
        ) : null}

        <button className="close-btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
