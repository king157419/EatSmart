import { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "warning" | "error";
  onClose: () => void;
}

export default function Toast({ message, type = "success", onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = { success: "✅", warning: "⚠️", error: "❌" };

  return (
    <div className={`toast toast-${type}`}>
      <span>{icons[type]} {message}</span>
      <button onClick={onClose}>×</button>
    </div>
  );
}
