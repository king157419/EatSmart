import { useState } from "react";
import type { Source } from "../../types";

interface CitationPanelProps {
  sources: Source[];
}

export default function CitationPanel({ sources }: CitationPanelProps) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="citations">
      <button
        className="citations-toggle"
        onClick={() => setOpen(!open)}
      >
        📎 查看参考来源 ({sources.length}) {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="citation-list">
          {sources.map((s, i) => (
            <div key={i} className="citation-item">
              <div className="source-name">📄 {s.file}</div>
              <div className="source-content">{s.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
