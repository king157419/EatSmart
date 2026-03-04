interface AdminButtonProps {
  onClick: () => void;
}

export default function AdminButton({ onClick }: AdminButtonProps) {
  return (
    <button
      className="header-btn admin-btn"
      onClick={onClick}
      title="管理控制台"
    >
      <span className="btn-icon-only">⚙️</span>
      <span className="btn-text">管理</span>
    </button>
  );
}
