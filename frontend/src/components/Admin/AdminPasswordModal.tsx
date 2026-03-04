import { useState } from "react";
import { apiAdminVerify } from "../../services/api";

interface AdminPasswordModalProps {
  onClose: () => void;
  onSuccess: (password: string) => void;
}

export default function AdminPasswordModal({
  onClose,
  onSuccess,
}: AdminPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const valid = await apiAdminVerify(password);
      if (valid) {
        onSuccess(password);
      } else {
        setError("密码错误");
      }
    } catch (err) {
      setError("验证失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-card admin-password-card" onClick={(e) => e.stopPropagation()}>
        <h2>🔐 管理员验证</h2>
        <p className="admin-hint">请输入管理员密码以访问控制台</p>

        <form onSubmit={handleSubmit} className="admin-password-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码"
            className="admin-password-input"
            autoFocus
            disabled={loading}
          />
          {error && <p className="error-hint">{error}</p>}
          <div className="admin-password-actions">
            <button
              type="submit"
              className="admin-verify-btn"
              disabled={loading || !password}
            >
              {loading ? "验证中..." : "验证"}
            </button>
            <button
              type="button"
              className="admin-cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
